# Frame

Frame is the frontend for an agent that turns unstructured notes into a structured build prompt.

You describe what you want to make, in whatever order it arrives. Frame pulls out the goal, the audience, the requirements, the boundaries, and the questions that are still open. The result is a prompt you can hand to a coding agent, or a brief for a product or design conversation.

This first version drafts the prompt in the browser. Nothing is uploaded. The drafter returns a stable prompt shape so a model can replace it later without changing the workspace.

## Run it

```bash
cd frontend
npm install
npm run dev
```

The app is at `http://localhost:5173`.

```bash
npm test
npm run build
```
