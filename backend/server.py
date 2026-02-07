import os
import uuid
from typing import Optional

import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ollama import chat

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/jorge_ai",
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    return psycopg.connect(DATABASE_URL)


class CreateConversationBody(BaseModel):
    user_id: str
    title: Optional[str] = None


class SendMessageBody(BaseModel):
    content: str
    model: str = "llama3.2:3B"


class EditConversationBody(BaseModel):
    title: str


@app.get("/conversations")
async def list_conversation(user_id: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            WHERE user_id = %s
            ORDER BY updated_at DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()

    return {
        "conversations": [
            {
                "id": str(r[0]),
                "title": r[1],
                "created_at": r[2].isoformat(),
                "updated_at": r[3].isoformat(),
            }
            for r in rows
        ]
    }


@app.post("/conversations")
async def create_conversation(body: CreateConversationBody):
    convo_id = str(uuid.uuid4())

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                VALUES (%s, %s, %s, now(), now())
                RETURNING id, title, created_at, updated_at
                """,
                (convo_id, body.user_id, body.title),
            )
            row = cur.fetchone()
            conn.commit()
    except psycopg.errors.ForeignKeyViolation:
        raise HTTPException(
            status_code=400, detail="user_id does not exist in users table"
        )

    if row is None:
        raise HTTPException(status_code=500, detail="Failed to create conversation")

    return {
        "conversation": {
            "id": str(row[0]),
            "title": row[1],
            "created_at": row[2].isoformat(),
            "updated_at": row[3].isoformat(),
        }
    }


@app.get("/conversations/{conversation_id}/messages")
async def fetch_messages(
    conversation_id: str, limit: int = 50, before_id: Optional[int] = None
):
    with get_conn() as conn, conn.cursor() as cur:
        if before_id is None:
            cur.execute(
                """
                SELECT id, role, content, created_at
                FROM messages
                WHERE conversation_id = %s
                ORDER BY id DESC
                LIMIT %s
                """,
                (conversation_id, limit),
            )
        else:
            cur.execute(
                """
                SELECT id, role, content, created_at
                FROM messages
                WHERE conversation_id = %s AND id < %s
                ORDER BY id DESC
                LIMIT %s
                """,
                (conversation_id, before_id, limit),
            )
        rows = cur.fetchall()

    rows = list(reversed(rows))  # ascending for UI
    return {
        "messages": [
            {"id": r[0], "role": r[1], "content": r[2], "created_at": r[3].isoformat()}
            for r in rows
        ]
    }


@app.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, body: SendMessageBody):
    user_text = body.content.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="content is required")

    # 1) Insert user message + load context
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO messages (conversation_id, role, content, created_at)
            VALUES (%s, 'user', %s, now())
            RETURNING id, created_at
            """,
            (conversation_id, user_text),
        )
        user_row = cur.fetchone()
        if user_row is None:
            raise HTTPException(status_code=500, detail="Failed to insert user message")

        cur.execute(
            """
            SELECT role, content
            FROM messages
            WHERE conversation_id = %s
            ORDER BY id DESC
            LIMIT 20
            """,
            (conversation_id,),
        )
        ctx = list(reversed(cur.fetchall()))
        conn.commit()

    ollama_messages = [{"role": role, "content": content} for (role, content) in ctx]

    # 2) Call Ollama
    resp = chat(model=body.model, messages=ollama_messages, stream=False)
    assistant_text = resp.message.content

    # 3) Insert assistant + bump updated_at
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO messages (conversation_id, role, content, created_at)
            VALUES (%s, 'assistant', %s, now())
            RETURNING id, created_at
            """,
            (conversation_id, assistant_text),
        )
        asst_row = cur.fetchone()
        if asst_row is None:
            raise HTTPException(
                status_code=500, detail="Failed to insert assistant message"
            )

        cur.execute(
            "UPDATE conversations SET updated_at = now() WHERE id = %s",
            (conversation_id,),
        )
        conn.commit()

    return {
        "user_message": {
            "id": user_row[0],
            "role": "user",
            "content": user_text,
            "created_at": user_row[1].isoformat(),
        },
        "assistant_message": {
            "id": asst_row[0],
            "role": "assistant",
            "content": assistant_text,
            "created_at": asst_row[1].isoformat(),
        },
    }


@app.patch("/conversations/{conversation_id}")
async def edit_conversation(conversation_id: str, body: EditConversationBody):
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE conversations
            SET title = %s,
                updated_at = now()
            WHERE id = %s
            RETURNING id, title, created_at, updated_at
            """,
            (title, conversation_id),
        )
        row = cur.fetchone()
        conn.commit()

    if row is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "conversation": {
            "id": str(row[0]),
            "title": row[1],
            "created_at": row[2].isoformat(),
            "updated_at": row[3].isoformat(),
        }
    }


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):

    if not conversation_id:
        raise HTTPException(status_code=400, detail="No conversation found")

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM conversations
            WHERE id = %s
            RETURNING id, title, created_at, updated_at
            """,
            (conversation_id,),
        )
        row = cur.fetchone()
        conn.commit()

    if row is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "conversation": {
            "id": str(row[0]),
            "title": row[1],
            "created_at": row[2].isoformat(),
            "updated_at": row[3].isoformat(),
        }
    }
