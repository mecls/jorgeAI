import React from 'react';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

const markdownStyles = StyleSheet.create({
  body: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  strong: {
    color: '#fff',
    fontWeight: '700',
  },
  em: {
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  list_item: {
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet_list_icon: {
    color: '#6b7cff',
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
  },
  ordered_list_icon: {
    color: '#6b7cff',
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
  },
  bullet_list_content: {
    flex: 1,
  },
  ordered_list_content: {
    flex: 1,
  },
  code_inline: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#e8c8ff',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 13,
    fontFamily: 'Menlo',
  },
  fence: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 8,
    borderWidth: 0,
  },
  code_block: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 8,
    color: '#e8c8ff',
    fontSize: 13,
    fontFamily: 'Menlo',
    borderWidth: 0,
  },
  blockquote: {
    borderLeftColor: '#6b7cff',
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginVertical: 8,
    backgroundColor: 'rgba(107,124,255,0.08)',
    borderRadius: 4,
  },
  link: {
    color: '#6b7cff',
    textDecorationLine: 'underline',
  },
  hr: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    height: 1,
    marginVertical: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    marginVertical: 8,
  },
  thead: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  th: {
    padding: 8,
    color: '#fff',
    fontWeight: '600',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  td: {
    padding: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tr: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <Markdown style={markdownStyles}>
      {content}
    </Markdown>
  );
}
