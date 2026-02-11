import os
import uuid
from typing import Optional
import psycopg
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ollama import chat
from pathlib import Path
from pypdf import PdfReader  # for PDFs [web:886]
from pptx import Presentation  # for PPTX (python-pptx)
from typing import Any, cast

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
    model: str = "qwen3:4b"


class EditConversationBody(BaseModel):
    title: str


def extract_text_from_pptx(path: str) -> str:
    pres = Presentation(path)
    parts: list[str] = []

    for slide in pres.slides:
        for shape in slide.shapes:
            sh = cast(Any, shape)  # Pylance workaround
            if not sh.has_text_frame:  # documented [web:935]
                continue

            text = sh.text_frame.text  # documented [web:935]
            if text and text.strip():
                parts.append(text.strip())

    return "\n\n".join(parts)


def extract_text_for_file(mime: str, path: str) -> str:
    p = Path(path)

    if mime == "application/pdf":
        reader = PdfReader(str(p))  # [web:886]
        return "\n".join((page.extract_text() or "") for page in reader.pages)

    if (
        mime
        == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ):
        return extract_text_from_pptx(str(p))

    # images: not processed yet
    return ""


def build_files_context(conversation_id: str, max_chars: int = 12000) -> str:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT filename, mime_type, storage_path
            FROM conversation_files
            WHERE conversation_id = %s
            ORDER BY id ASC
            """,
            (conversation_id,),
        )
        rows = cur.fetchall()

    blocks: list[str] = []
    for filename, mime, storage_path in rows:
        text = extract_text_for_file(mime or "", storage_path)
        if text and text.strip():
            blocks.append(f"FILE: {filename}\n{text.strip()}")

    ctx = "\n\n---\n\n".join(blocks)
    return ctx[:max_chars]


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
        # Load attached files
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT filename, mime_type, storage_path
                FROM conversation_files
                WHERE conversation_id = %s
                ORDER BY id ASC
                """,
                (conversation_id,),
            )
            files = cur.fetchall()

        blocks = []
        for filename, mime, path in files:
            text = ""
            if (mime or "").startswith("application/pdf") or str(path).lower().endswith(
                ".pdf"
            ):
                reader = PdfReader(str(path))  # [web:886]
                text = "\n".join((page.extract_text() or "") for page in reader.pages)
            elif (mime or "").endswith("presentationml.presentation") or str(
                path
            ).lower().endswith(".pptx"):
                text = extract_text_from_pptx(str(path))

            if text.strip():
                blocks.append(f"FILE: {filename}\n{text.strip()}")

        files_text = "\n\n---\n\n".join(blocks)[:12000]

        ollama_messages = [
            {"role": role, "content": content} for (role, content) in ctx
        ]
        if files_text.strip():
            ollama_messages = [
                {
                    "role": "system",
                    "content": "You are a study assistant. Use the course files below as context.\n\n"
                    + files_text,
                }
            ] + ollama_messages

        resp = chat(
            model=body.model, messages=ollama_messages, stream=False, think=True
        )

    assistant_text = resp.message.content
    print("files found:", len(files), "mimes:", [f[1] for f in files])

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


# --------- FILE TREATMENT -----------
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/conversations/{conversation_id}/files")
async def upload_conversation_file(conversation_id: str, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="filename is required")

    mime = file.content_type or "application/octet-stream"

    # guarda no disco
    safe_ext = Path(file.filename).suffix.lower()
    stored_name = f"{uuid.uuid4().hex}{safe_ext}"
    dst = UPLOAD_DIR / stored_name

    size = 0
    with dst.open("wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            f.write(chunk)

    # regista na DB
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO conversation_files (conversation_id, filename, mime_type, size_bytes, storage_path)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, created_at
            """,
            (conversation_id, file.filename, mime, size, str(dst)),
        )
        row = cur.fetchone()
        conn.commit()

    if row is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "file": {
            "id": row[0],
            "conversation_id": conversation_id,
            "filename": file.filename,
            "mime_type": mime,
            "size_bytes": size,
            "created_at": row[1].isoformat(),
        }
    }


@app.get("/conversations/{conversation_id}/files")
async def list_conversation_files(conversation_id: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, filename, mime_type, size_bytes, created_at
            FROM conversation_files
            WHERE conversation_id = %s
            ORDER BY id DESC
            """,
            (conversation_id,),
        )
        rows = cur.fetchall()

    return {
        "files": [
            {
                "id": r[0],
                "filename": r[1],
                "mime_type": r[2],
                "size_bytes": r[3],
                "created_at": r[4].isoformat(),
            }
            for r in rows
        ]
    }
