import { MentionParserService } from './mention-parser.service';

describe('MentionParserService', () => {
  it('extracts unique usernames case-insensitively', () => {
    const service = new MentionParserService();

    expect(
      service.extractUsernames('Ping @John.Doe and @john.doe plus @ALICE_1.'),
    ).toEqual(['alice_1', 'john.doe']);
  });
});
