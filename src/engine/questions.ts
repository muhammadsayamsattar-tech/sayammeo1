import { clean, impliesFormat, isCommunication } from "./text";
import type { ClarifyingQuestion, TaskIntake, TaskScale } from "./types";

const LIMIT: Record<TaskScale, number> = {
  small: 2,
  medium: 4,
  large: 6,
};

export function clarifyingQuestions(intake: TaskIntake, scale: TaskScale): ClarifyingQuestion[] {
  const request = clean(intake.request);
  const questions: ClarifyingQuestion[] = [];
  const formatKnown = Boolean(clean(intake.outputHint)) || impliesFormat(request);
  const comms = isCommunication(intake);

  const ask = (question: ClarifyingQuestion) => {
    if (!questions.some((item) => item.field === question.field)) {
      questions.push(question);
    }
  };

  if (!formatKnown) {
    ask({
      id: "output",
      field: "outputHint",
      priority: "required",
      prompt: "What should the finished piece look like?",
      why: "An explicit format stops the model from choosing its own essay shape.",
    });
  }

  if (!clean(intake.audience) && (comms || scale !== "small")) {
    ask({
      id: "audience",
      field: "audience",
      priority: comms || scale === "large" ? "required" : "helpful",
      prompt: "Who has to act on this?",
      why: "Reader, tone, and length all follow from the person who uses the result.",
    });
  }

  if (!clean(intake.constraints) && scale === "small") {
    ask({
      id: "constraints",
      field: "constraints",
      priority: "helpful",
      prompt: "What limit should the model respect?",
      why: "One limit — length, claim, or tone — is worth more than a page of style notes.",
    });
  }

  if (!clean(intake.success) && scale !== "small") {
    ask({
      id: "success",
      field: "success",
      priority: scale === "large" ? "required" : "helpful",
      prompt: "How will you know this is done?",
      why: "A done-when line becomes the acceptance check in the prompt.",
    });
  }

  if (!clean(intake.sources) && scale !== "small") {
    ask({
      id: "sources",
      field: "sources",
      priority: "helpful",
      prompt: "Which sources may the model use?",
      why: "Naming sources keeps numbers, quotes, and policy out of the model's imagination.",
    });
  }

  if (scale === "large") {
    if (!clean(intake.nonGoals)) {
      ask({
        id: "nonGoals",
        field: "nonGoals",
        priority: "required",
        prompt: "What is out of scope?",
        why: "Large tasks sprawl unless the prompt names work that should be refused.",
      });
    }
    if (!clean(intake.owner)) {
      ask({
        id: "owner",
        field: "owner",
        priority: "required",
        prompt: "Who owns the decision?",
        why: "A named owner tells the model whose tradeoff wins.",
      });
    }
    if (!clean(intake.stakeholders)) {
      ask({
        id: "stakeholders",
        field: "stakeholders",
        priority: "helpful",
        prompt: "Who else is affected?",
        why: "Stakeholder names stop a program brief from speaking to nobody in particular.",
      });
    }
    if (!clean(intake.deadline)) {
      ask({
        id: "deadline",
        field: "deadline",
        priority: "helpful",
        prompt: "What is the deadline or horizon?",
        why: "A date changes whether the prompt asks for a full plan or a first decision.",
      });
    }
  }

  if (!request) {
    return [
      {
        id: "request",
        field: "request",
        priority: "required",
        prompt: "What is the task, in one or two sentences?",
        why: "Stride sizes the prompt from the deliverable. The rest of the brief hangs on that sentence.",
      },
    ];
  }

  return questions.slice(0, LIMIT[scale]);
}
