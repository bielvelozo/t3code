# T3 Code fork

Personal fork of [pingdotgg/t3code](https://github.com/pingdotgg/t3code). The `custom` branch is upstream `main` plus the fork commits on top. `main` stays a plain mirror of upstream.

Fork-owned files: `FORK.md`, `fork/`, `apps/web/src/fork/`, `apps/server/src/fork/`, and `apps/desktop/src/fork/`. Everything else is upstream, including the line in `AGENTS.md` that points here.

## Add a change

Every change goes through a pull request into `custom`. Do not commit or push to `custom` directly.

- The repository is public. Keep private data out of every file, commit message, and pull request: hostnames, addresses, IPs, personal paths, and emails. The commit author name and email are fine.
- Keep fork changes free of database migrations. An upstream build cannot open a database that has a migration it does not know, so going back to the official app would fail.

1. `git fetch origin && git switch -c fork/<change> origin/custom`
2. Put new code in new files under `fork/`, `apps/web/src/fork/`, `apps/server/src/fork/`, or `apps/desktop/src/fork/`. In upstream files, change as few lines as possible, for example one import and one call. Each changed upstream line can conflict on a rebase.
3. Run the typecheck, the lint, the format check, and the tests of the area you changed: `vp run check:changed origin/custom`.
4. Push the branch and open a pull request into `custom` with the title `fork: <change>`.
5. Stop and ask the owner to approve. Merge only after the approval.
6. Rebase the branch onto the latest `custom` and squash merge it:

   ```sh
   git fetch origin && git rebase origin/custom && git push --force-with-lease
   gh pr merge <number> --squash --delete-branch
   ```

   The squash keeps one `fork: <change>` commit per change.

## Sync with upstream

```sh
git fetch upstream
git switch custom && git rebase upstream/main
git push --force-with-lease origin custom
```

Resolve conflicts commit by commit. Byte counts in `apps/server/src/provider/agentContextBudget.json` are not merged by hand: take upstream's values, then update them to what the budget test reports.

## Run it locally

```sh
vp i
vp run dev --home-dir ~/.t3-fork
```

For the desktop app, run `vp run dev:desktop --home-dir ~/.t3-fork` instead. Set `T3CODE_DESKTOP_DEVTOOLS=0` to keep it from opening DevTools with the window.

`--home-dir` keeps the fork's data apart from the installed app in `~/.t3`. Never run the fork against `~/.t3`. Open the `pairingUrl` from the server log.

On Windows with NTFS last-access updates on, `node --watch` restarts the server every time a file is read, so it never comes up. Locally, drop `--watch` from the `dev` script in `apps/server/package.json` and do not commit that change. Server changes then need a restart; the web app still reloads on its own.
