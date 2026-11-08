# Find a work

For the admin only. The tile checks the admin flag in the app, and `job-search` and `job-profile-draft` check `app_admins` on the server. The app never calls freehire or Groq.

- `job-search` runs at 6 AM PHT, and from Refresh. It searches freehire with the profile, removes closed posts and repeats, asks Groq for a 1 to 5 score, and keeps the top 20 new matches. A failed run keeps the last good list.
- Groq ranks 5 jobs a request. After a 429 the function waits as `retry-after` says (20 seconds at most) and tries again, up to 3 tries a batch and 60 seconds of waiting a run. When ranking still fails, it saves the rest with no score, and the list shows "Not ranked" after the ranked jobs. The next run ranks up to 10 of them first.
- `job_profiles.last_error` says why the last run stopped: `groq_busy`, `search_down` or `failed`. It holds a code, never job text, and the screen shows a notice for it. A clean run clears it.
- A letter is drafted only when you ask. Copy letter and open application copies it and opens the job. The app never submits a form, and it never signs in to a job site.
- `job-profile-draft` reads a resume PDF in memory. It removes emails, phone numbers and links, and Groq drafts a profile. It stores nothing. A name or a street address cannot be removed by rule, so you check the draft before you save it.
- A job post is untrusted text. `_shared/jobs.ts` removes HTML, and only an `https` link opens. Groq output shows as plain text.
- freehire ignores an unknown filter and returns the whole catalogue, so `job-search` stops when `meta.ignored_params` has a value. The filter value is a lowercase country code.
- The free freehire API is for personal use, which is one reason this stays admin only.
