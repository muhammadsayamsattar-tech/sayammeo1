# Stride

Stride is a business prompt studio. Describe the work, and it writes a prompt sized to the task: short for a small deliverable, structured for a medium work product, and bounded for a large program.

The brief stays in the browser. Paste the result into the model your team already uses.

## How the agent works

1. **Size the task.** Small, medium, or large, from the deliverable, the stakes, and the people involved.
2. **Ask only for missing facts.** A small task gets at most two questions. A large task gets at most six.
3. **Write the prompt.** Each size keeps the sections that change the output and leaves the rest out.
4. **Check the brief.** Stride flags a missing format, a vague opening, a missing boundary on large work, and a prompt that has grown past its budget.

| Size | Use it for | The prompt includes | Left out |
| --- | --- | --- | --- |
| Small | A reply, rewrite, summary, or short list | Task, context, limits, output, working rules | Role essays, phases, stakeholder maps |
| Medium | A memo, SOP, comparison, or one-pager | Role, objective, requirements, method, quality bar | Program plans and decision-rights registers |
| Large | An operating plan, board paper, or market entry | Scope, stakeholders, phases, decision rules, acceptance | Padding and repeated background |

You can override the size. The suggestion stays visible so a close call is easy to reconsider.

## Run it

```bash
npm install
npm test
npm run dev
```

Open the local URL Vite prints. `npm run build` writes a static app to `dist/`.

## Make a brief

Start from a sample job (customer reply, vendor memo, operating plan) or clear the form and write the task in one or two sentences. Add the reader and the finished shape first. Limits, sources, the decision owner, and out-of-scope lines are worth adding when you know them.

Copy or download the markdown and paste it as the instruction to your model, with the source material the prompt names.
