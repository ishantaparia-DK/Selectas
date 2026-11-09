// The database raises short codes. This turns them into something a person can read.
const MESSAGES: Record<string, string> = {
  already_sent_today: "You already sent today's song. Come back tomorrow.",
  not_friends: 'You can only send songs to friends.',
  invalid_link: 'That link does not look like a music link.',
  invalid_note: 'That message is not one of the allowed options.',
  user_not_found: 'No one has that username.',
  cannot_friend_self: "That's you! Try a friend's username.",
  already_friends: 'You are already friends.',
  already_requested: 'You already sent them a request.',
  request_not_found: 'That request is no longer there.',
  delivery_not_found: 'That song could not be found.',
  already_rated: 'You already rated that song.',
  invalid_timezone: 'Your phone reported an unknown timezone.',
  not_signed_in: 'Please sign in again.',
};

export function friendlyError(message: string | undefined | null): string {
  if (!message) return 'Something went wrong. Try again.';
  for (const code of Object.keys(MESSAGES)) {
    if (message.includes(code)) return MESSAGES[code];
  }
  if (/network|fetch failed|failed to fetch/i.test(message)) return 'No connection. Check your internet and try again.';
  return message;
}
