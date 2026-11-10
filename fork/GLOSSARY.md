# T3 Code fork

Terms this fork adds on top of upstream T3 Code. Upstream terms live in `docs/internals/glossary.md`.

## Sidebar thread states

Every active thread is in exactly one of these states, in project folders and in the plain list. Settled and snoozed threads are outside them.

**Working**:
The agent is running a turn, or waiting on background work it will resume from by itself.
_Avoid_: Running, busy

**Needs you**:
The agent has stopped and the next step is yours: it asked a question or an approval, or it finished, failed, or was interrupted and you have not read it yet.
_Avoid_: Waiting, pending, awaiting reply

**Observing**:
The agent is watching something you did over a set period, to confirm it holds, and will report the outcome when the period ends.
_Avoid_: Validating, monitoring, watching

**Idle**:
Nothing is running and nothing waits on you: you have read the last answer and chose not to reply yet.
_Avoid_: Done, quiet, inactive

**Observation**:
One stretch of Observing, with what is being watched, when it ends, and its outcome.
_Avoid_: Check, validation
