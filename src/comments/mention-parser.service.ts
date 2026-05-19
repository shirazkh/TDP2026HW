import { Injectable } from '@nestjs/common';

const MENTION_PATTERN = /(^|[^\w])@([a-zA-Z0-9_][a-zA-Z0-9_.-]*)/g;

@Injectable()
export class MentionParserService {
  extractUsernames(text: string | null | undefined): string[] {
    if (!text) {
      return [];
    }

    const mentions = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = MENTION_PATTERN.exec(text)) !== null) {
      const username = match[2].replace(/[.-]+$/g, '').toLowerCase();

      if (username.length > 0) {
        mentions.add(username);
      }
    }

    return [...mentions].sort();
  }
}
