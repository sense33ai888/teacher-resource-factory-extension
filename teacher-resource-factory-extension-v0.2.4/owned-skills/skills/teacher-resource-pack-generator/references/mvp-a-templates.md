# MVP-A Template Library

Use these templates for Core Teaching Pack generation.

## Lesson Templates

### lesson_deck_science_concept

Use when introducing a factual science/topic concept.

Slots:

```text
title
learning_intention
success_criteria
hook_question
key_vocabulary
explicit_teaching_1
explicit_teaching_2
key_point_callout
example_or_diagram_prompt
quick_check
answer_reveal
guided_practice
student_activity
exit_ticket
teacher_notes
```

Avoid when the task is mainly assessment or open inquiry.

### lesson_deck_math_strategy

Use when teaching a named math method or procedure.

Slots:

```text
title
learning_intention
why_strategy_matters
key_vocabulary
worked_example
step_by_step_method
guided_practice
quick_check
answer_reveal
common_mistake
independent_practice_prompt
exit_ticket
teacher_notes
```

### lesson_deck_vocabulary_intro

Use when a topic has new key words students need before a task.

Slots:

```text
title
learning_goal
topic_context
word_set
student_friendly_definitions
examples_non_examples
quick_check
pair_share
apply_the_words_task
exit_ticket
teacher_notes
```

### lesson_deck_revision_recap

Use for review, test preparation, or end-of-topic consolidation.

Slots:

```text
title
today_we_are_reviewing
core_ideas
quick_recall
worked_example_or_model
practice_round_1
answer_reveal_1
practice_round_2
misconception_fix
final_challenge
exit_ticket
teacher_notes
```

## Worksheet Templates

### worksheet_scaffolded_practice

Use for normal practice after a lesson.

Sections:

```text
name_date_header
title
short_context
key_vocabulary
worked_example
practice_questions
real_world_application
challenge_extension
reflection
answer_key
```

### worksheet_knowledge_check

Use for factual recall, concept checks, or end-of-topic checks.

Sections:

```text
name_date_header
title
core_concept_box
recall_questions
multiple_choice
short_response
application_questions
error_or_misconception_question
answer_key
```

### worksheet_math_strategy

Use for strategy practice in maths.

Sections:

```text
name_date_header
strategy_title
why_strategy_helps
worked_example
step_by_step_method
your_turn_questions
word_problems
error_analysis
create_your_own
answer_key
```

### worksheet_reading_comprehension

Use for reading passage plus comprehension questions.

Sections:

```text
name_date_header
title
short_reading_passage
key_word_box
retrieval_questions
inference_questions
vocabulary_in_context
compare_or_explain_question
extension_question
answer_key
```

## Phase B Visual Templates

Use only after the Core Teaching Pack is coherent and rendered.

```text
labelled_concept_diagram
blank_labelling_worksheet
vocabulary_poster_6_cards
```

Implement labelled diagrams with `scripts/render-labelled-diagram.mjs` plus topic data:

```text
labelled_concept_diagram: topic-specific concept diagram from a data file
blank_labelling_worksheet: same diagram with numbered callouts and word bank
```

If the topic is not diagram-friendly, do not force this template. Mark the visual pair as not applicable or record an anchor-chart/checklist gap for later template work.

## Phase C Game Template

Use only after the Core Teaching Pack and first visual pair are usable:

```text
escape_quiz_game
```

Implement with `scripts/render-escape-quiz.mjs` plus topic data:

```text
escape_quiz_game: teacher-reviewable question data embedded in one HTML file with timer, progress, difficulty selection, and hints
escape_quiz_printable_fallback: printable quiz and answer key generated from the same question data
```
