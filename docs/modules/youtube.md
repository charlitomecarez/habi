# YouTube

YouTube shows the new videos of the channels you follow, newest first. It is in More › Daily life, after Movies. It needs no server key, so it shows on every server.

## Screens

- **Videos** (`app/(app)/youtube/index.tsx`): one list in groups of Today, Yesterday and each date. A row has the thumbnail, the title on two lines, the channel and the age. A tap opens the video in the YouTube app. The Channel field filters the list; its first choice is All channels. The "Your channels" row at the top opens the next screen.
- **Your channels** (`app/(app)/youtube/channels.tsx`): add a channel by its link or its @handle. Add channel is the one primary action. Remove has Undo for 8 seconds. A channel whose feed failed says so in its own row.
- With no channel, the list shows one action, Add a channel, and says that Habi does not use your YouTube account.

## Data

- `youtube_channels` (owned, owner RLS): `channel_id` and `title`. A trigger stops a 31st channel.
- `youtube_videos` and `youtube_feeds` (cache by channel): you read a row only when you follow its channel, so another account's channels stay hidden. Only the service role writes them.
- `youtube-channel` (`verify_jwt = true`) turns a link or a handle into a channel ID, saves the row as the caller, and loads the channel's last 15 videos at once.
- `youtube-sync` runs at 5:30 AM PHT. It reads each followed channel's feed 1 second apart. It deletes videos older than 60 days and the cache of channels that nobody follows.
- The public feed has no video length, so the thumbnail shows no length. The thumbnail comes from the video ID on `i.ytimg.com`.

## Not in YouTube

- Your YouTube home feed. That needs your Google account.
