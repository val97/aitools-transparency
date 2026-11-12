# Welcome to AI-Tools

> Fork of Eglantine Vialaneix's AI Tools, adding conditions C4 to C7 for a study of transparency and students' mental models of machine learning. C1 to C3 are the original activity.

## `trial-run-black-box` branch: the version for the trial

This branch is `trial-run` with the black-box step of `black-box-step` added at the start, for a trial where each group works on its own computer (no network needed). The goal is an activity of 25 to 30 minutes, with a paper pre/post sheet instead of questions inside the app, and timing data to find where groups get stuck. `trial-run` and `black-box-step` stay as they were.

**Changes compared with `main`**

- **Shorter data labelling**: students read 5 sheets (3 herbivores, 2 carnivores, including the deliberately mislabelled Styracosaurus); the other 5 start already sorted, "annotated earlier by the team" (`SHEETS_TO_READ` in `app/lib/fixedData.ts`). The model still trains on all 10 labels, so its results do not change.
- **No questions inside the app**: removed the data-preparation question, the optional "why" of the feature guess and the two reflection questions at the end. The note box during labelling stays.
- **Easier counting**: the accuracy page marks each prediction ✅ or ❌ on a green or red row (C1 to C3 get the same column in their table).
- **Clearer model reveal (C5, C6)**: page 2/3 compares the guess with the tree feature by feature, says whether the "most important" pick matches the tree's first question, tags each question card, and lists the dinosaurs as picture cards. Page 3/3 makes clickable questions pulse and keeps "Suite" disabled until a second question has been opened.
- **Time per screen**: every session logs its screens and key clicks and saves as it goes. A live **Sessions** tab on the start page and `npm run timings` show the minutes per screen (see [Time per screen](#time-per-screen-trial-run)).
- **Black-box step first** (from `black-box-step`): right after the keys, each group sees a short black-box step on its own computer: the activity's model sorts 6 new dinosaurs, each shown as its card with the model's answer stamped on it next to the right group (half are wrong), then "Maintenant, vous allez découvrir comment ce programme fonctionne." and the condition's normal flow. Details in [Run 1](#run-1-black-box-warm-up-all-conditions).
- Also from `feature/sortable-prediction-table`: the C4 to C7 prediction table can be sorted by column.

**Running the trial on two computers**

1. On each computer, once before class: clone the repository, `git switch trial-run-black-box`, then follow [Getting Started](#getting-started) (`npm install`, `npm run setup:backend`).
2. On the day, on each computer: `npm run dev:backend` in one terminal, `npm run dev` in another, then open http://localhost:3000.
3. Stay on the **Élèves** tab and type the group's keys (the third key is optional, so groups of 2 leave it empty):

   | Computer | Condition | Keys |
   |---|---|---|
   | 1 | C4 | `921`, `534` |
   | 2 | C5 | `731`, `146` |

4. Write each student's key on their paper sheet, to match it with the app's data.
5. After class, each computer has its session in `data/experiment-collections/`. Copy that folder's `.json` files from one computer into the other's, then run `npm run timings` there to see both groups side by side (see [Time per screen](#time-per-screen-trial-run)).

**Quick test (about 10 minutes)**

1. Start the app as above, click the **Tester une condition** tab and pick **C5** or **C6** (the conditions with the most changes; C4 and C7 skip the two tree pages). Test sessions are saved with group 0 and kept apart from student data.
2. Go through the steps:
   - **Black-box step**: intro with a fan of cards, 6 cards with the stamped answers, then the transition sentence.
   - **Data labelling**: the instructions say 5 sheets are already annotated; only 5 remain to read.
   - **Data preparation**: no question, "Suite" works straight away.
   - **Model training**: press Entraîner, then Suite; tick the features you think the model uses and pick the most important one (pick a wrong one to see the correction).
   - **Page 2/3**: the guess-vs-tree panel on the left, the tags on the tree, the dinosaur cards on the right.
   - **Page 3/3**: "Suite" stays grey until you open a second question.
   - **Evaluation**: 10 cards, then the accuracy page with the ✅/❌ column (the answers are 3 correct, 7 wrong, 10 total, 30%), then "Sauvegarder et finir !".
3. Back on the start page, open the **Sessions** tab and tick **Inclure les tests**: your run appears with its minutes per screen, starting with the black-box screens ("BN intro", "BN cartes", "BN fin").
4. In a terminal: `npm run timings -- --include-dev` prints the same table.

AI-Tools is a digital platform designed to introduce machine learning concepts to teenagers around 14 years old. In the application, students take on the role of archaeologists and follow the four main steps of a typical machine learning pipeline in order to train an algorithm to classify dinosaurs as either **Carnivores** or **Herbivores**.

The learning sequence is organized into four activities: **data labelling**, **feature selection**, **model training**, and **evaluation**. Through these activities, students progressively discover how training data is created, how relevant features are selected, how a model learns from data, and how its performance can be assessed.

AI-Tools also investigates the impact of making parts of the machine learning pipeline visible to learners. For this reason, the application contains two versions of the first three activities: a **black-box** version and a **white-box** version. The black-box version hides most of the internal mechanisms of the pipeline, while the white-box version makes selected steps more explicit and manipulable by students. Mor einformation can be found in my final report `AI Tools compressed.pdf`.

The suffixes ``BB`` and ``WB`` refer respectively to the **black-box** and **white-box** versions of an activity. This distinction was used during development to compare how much of the machine learning pipeline should be made visible to support students' understanding.

The application follows Next.js' App Router structure. Each learning activity is implemented as a route, while API endpoints handle model-related computations and experiment data collection.

The current repository is organized as follows:

```bash
.
├── app/                         # Next.js App Router directory
│   ├── api/                     # API routes
│   │   ├── evaluation/
│   │   │   └── predictions/
│   │   │       └── route.ts     # Stores or retrieves model predictions
│   │   ├── experiment/
│   │   │   ├── collection/
│   │   │   │   └── route.ts     # Collects experimental data
│   │   │   └── sessions/
│   │   │       └── route.ts     # Time per screen of the saved sessions (Sessions tab)
│   │   └── modelling/
│   │       └── gini/
│   │           └── route.ts     # Computes Gini impurity for model training
│   │
│   ├── data_labelling/          # Step 1: data labelling activity
│   │   ├── page.tsx             # Main version
│   │   ├── pageBB.tsx           # Black-box version
│   │   └── pageWB.tsx           # White-box version
│   │
│   ├── feature_selection/       # Step 2: feature selection activity
│   │   ├── page.tsx             # Main version
│   │   ├── pageBB.tsx           # Black-box version
│   │   └── pageWB.tsx           # White-box version
│   │
│   ├── modelling/               # Step 3: model training activity
│   │   ├── page.tsx             # Main version
│   │   └── pageWB.tsx           # White-box version
│   │
│   ├── evaluation/              # Step 4: evaluation activity
│   │   ├── page.tsx             # Evaluation page
│   │   └── fin/
│   │       └── page.tsx         # Final screen
│   │
│   ├── backend/                 # Server-side logic and helper functions
│   ├── components/              # Reusable UI components
│   ├── lib/                     # Utility functions
│   ├── globals.css              # Global styles
│   └── page.tsx                 # Home page
│
├── data/                        # Dataset files used by the application
├── public/                      # Static assets such as images and csv files
├── scripts/                     # Backend setup, npm run timings and its shared calculations
├── package.json                 # Project dependencies and npm scripts
├── README.md                    # Repository documentation
└── AI Tools compressed.pdf      # Project final report
```

## Getting Started

Install the JavaScript dependencies:

```bash
npm install
```

Set up the Python backend virtual environment:

```bash
npm run setup:backend
```

> 💡 This creates app/backend/.venv and installs the backend packages from app/backend/requirements.txt.

Compile for deployment:

```bash
npm run build
```

## Deployment

>[!WARNING]
>Make sure you followed all steps from ```Getting Started``` before getting to deployment!

### 1) Launch the backend in one terminal

```bash
npm run dev:backend:network
```

### 2) Run the development server from another terminal

Once the backend is launched, you can either run the app:

- **locally only**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

- **OR as a server**

```bash
npm run start:network
```

For other machines to connect, open ```http://XXX.XXX.XXX.XXX:3000``` (where you replace XXX.XXX.XXX.XXX with your IP address) in their browser, preferably a Chromium one.

To get your IP address and share it with other machines to connect to your network, run (in yet another terminal):

```bash
ipconfig getifaddr en0
```

### 3) Enter a set of user keys (setting the experiment condition)

To ensure data collection, a set of user keys was created in order to assigned the condition to the session state. We therefore defined three developper key sets to enter the app in each one of the preset conditions:

- C1 (Glass-Box): `C1devX` and `C1devY`
- C2 (Grey-Box): `C2devX` and `C2devY`
- C3 (Black-Box): `C3devX` and `C3devY`

- C4 (Data shown, model hidden): `C4devX` and `C4devY`
- C5 (Data hidden, model revealed after predicting): `C5devX` and `C5devY`
- C6 (Data shown, model revealed after predicting): `C6devX` and `C6devY`
- C7 (Data hidden, model hidden): `C7devX` and `C7devY`

The third user key is always optional.

Quicker for testing: the start page has three tabs. "Élèves" is where groups enter their keys (the default, used in class). "Sessions" shows the time per screen of every session (see [Time per screen](#time-per-screen-trial-run)). "Tester une condition" shows the new activities (C4 to C7) as a 2×2 grid and the original activity (C1 to C3, kept as the reference), each card saying what is visible; one click starts that condition with its developer keys (group "dev"). After the choice, a "Mode test" badge names the condition and "Changer" goes back.

### Conditions C4 to C7 (same actions, different transparency)

C4 to C7 were added for the exploratory mental-model study. They form a 2×2: the data preparation is shown (C4, C6) or hidden (C5, C7), and the model is revealed after the guess (C5, C6) or stays closed (C4, C7). The table below describes C4 and C5; C6 does C4's data steps followed by C5's model and evaluation, and C7 does C5's data steps followed by C4's model and evaluation. Nobody labels or picks features: an "archaeologist team" prepared the data (`app/lib/fixedData.ts`). All four conditions train on exactly the same labels and features with the same greedy Gini algorithm, so they get the same tree. Students perform the same actions; only what they see differs.

| Step | C4 (data shown, model hidden) | C5 (data hidden, model shown) |
|---|---|---|
| Data labelling | Read the 5 remaining sheets (the other 5 are already sorted), with the dinosaur's drawing next to the sheet; each card shows the archaeologists' label and their reason | Read the 5 remaining sheets, with the drawing; no labels shown |
| Data preparation | Labelled table and the 4 chosen features with the team's reason | Only "the data has been prepared" |
| Model training | Hidden tree; press Entraîner, then Suite opens a separate page where they see what it predicted for each training dinosaur (table, no labels), then tick the features they think it uses and pick the most important one | Same task (page 1/3), then "Ouvrir le modèle" leads to two more full-screen pages. 2/3: the tree, with their guess compared feature by feature on the left (and their "most important" pick against the tree's first question), each question card tagged, and the dinosaurs as picture cards on the right to follow their path. 3/3: the Gini explanation, then the same tree, where clicking a question shows its Gini impurity; "Suite" waits until a second question is opened. "Retour" goes back; the guess is locked once the model is opened. No tables with labels |
| Evaluation | New dinosaurs one card at a time (data, the closed model's prediction, real diet), then a page to calculate accuracy where each prediction is marked ✅ or ❌ | Same, but each card also shows the dinosaur's path down the tree |

In C5 and C6 the revealed tree is drawn like C1's tree: question cards with NON/OUI buttons, connector lines, and the path of the selected dinosaur in blue (`app/modelling/ModelReveal.tsx`).

One archaeologist label is deliberately wrong (`MISLABELLED_DINO` in `app/lib/fixedData.ts`, default Styracosaurus labelled carnivore). Set it to `null` for correct labels only. With the default features (bipède, longueur, poids, période) the tree gets 100% on training and 30% on the test set; with no wrong label, 50%.

The feature guess is saved in `BBModellingAnswers` (C4 to C7), and `TrainedTree` (C5 and C6, saved when the model is opened). On this branch the free-text fields (`FeatureSelectionReason`, `PerfSatisfactionAnswer`, `ImprovementsAnswer`) stay empty: those questions are on the paper pre/post sheet.

Participant keys: C4 group 1 `921, 534, 267`, group 2 `418, 893, 652`; C5 group 1 `731, 146, 395`, group 2 `587, 812, 269`; C6 group 1 `643, 358, 972`, group 2 `415, 786, 239`; C7 group 1 `527, 864, 193`, group 2 `346, 615, 958`.

C1, C2 and C3 keep their own steps; on this branch they share the shorter labelling (5 sheets), the ✅/❌ column and the end without reflection questions, because these screens are common to all conditions.

### Time per screen (trial run)

Each session keeps a `TimeLog`: one line per screen reached (`run1_intro`, `run1_cards`, `run1_transition` for the black-box step, `mission`, `data_labelling`, `data_preparation` or `feature_selection`, `model_training`, `model_guess`, `model_tree`, `model_gini`, `evaluation`, `eval_cards`, `eval_accuracy`, `end`) and per key click (`help_opened`, `model_trained`, `tree_dino:…`, `gini_question:…`, `accuracy_check:ok|wrong`). Every new screen also sends the session to the server, which overwrites its file in `data/experiment-collections/`, so groups that never finish still leave their data; only the final save is added to `collections.jsonl`.

After class, run:

```bash
npm run timings
```

It prints the minutes each group spent on each screen (`!` marks a screen more than 1.5× its median), where unfinished groups stopped, help clicks, accuracy checks, and medians per condition. `--include-dev` adds the "Tester une condition" runs, `--csv timings.csv` also writes one row per group. Times are per computer, so per group when students share one.

During class, the start page's "Sessions" tab shows the same table live (refreshed every 10 s, today's sessions by default, test runs on request): each running group's current screen and for how long, in red when slower than usual, and medians per condition. It reads `/api/experiment/sessions`, which leaves out participant keys. The shared calculations are in `scripts/sessionTimings.mjs`.

### Run 1 (black-box warm-up, all conditions)

After the start page (keys or "Tester une condition"), every condition first does Run 1, then the activity above (Run 2). On this branch each group sees it on its own computer (on `black-box-step` it was meant for a big screen); students note their ideas on the paper sheet. Run 1 only shows what "the program" answers: an intro, 6 dinosaurs one at a time (its answer and the right group, highlighted when they differ), then "Maintenant, vous allez découvrir comment ce programme fonctionne." No data, tree, training step or accuracy is shown (`app/run1/Run1Activity.tsx`).

The program is the C4 to C7 activity's own model, not a separate one: Run 1 builds it exactly as the modelling page does (`df_train.csv`, the archaeologists' labels including the wrong Styracosaurus, the 4 prepared features, the same greedy Gini algorithm), so it is the same tree students later meet in the activity. It shows the dinosaurs listed in `public/data/run1/df_test.csv` (same format as `public/data/`), in file order: 6 dinosaurs that appear nowhere in the activity (facts from the NHM Dino Directory), Triceratops, Hypsilophodon, Velociraptor, Ceratosaurus, Ankylosaurus, Edmontosaurus. The model answers 3 herbivores and 3 carnivores and gets half of them wrong (Hypsilophodon and Edmontosaurus, herbivores it calls carnivores; Ceratosaurus, a carnivore it calls herbivore), close to its 30% on the activity's test set. Edit that file to change the dinosaurs. Each one appears as its card with the model's answer stamped on it: `public/data/run1/cards/<nom>.png` if present (the 6 cards are there, without the museum's dinosaur pictures, which are copyright NHM and not published here), otherwise the sheet in `public/dino_sheets/`, otherwise a plain card with the name. Saved fields: `Run1StartTime`, `Run1Features` (what the model could look at), `Run1Cards`, `Run1EndTime`, `Run2StartTime`.

## Acknowledgments

This project was made during the scope of my Semester Project in Pr. Francesco Mondada's lab: the MOBOTS Group where I was supervised by Valentina Ferraioli.

I, Eglantine Vialaneix, make the content of this repository available to the digital public under the [Creative Common BY-NC-SA-4.0 license](https://creativecommons.org/licenses/by-nc-sa/4.0/).

![CC BY-NC-SA-4.0](/public/Creative%20Commons%20NC%20SA.svg)

<!-- 
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details. -->
