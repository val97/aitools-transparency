# Welcome to AI-Tools

> Fork of Eglantine Vialaneix's AI Tools, adding conditions C4 to C7 for a study of transparency and students' mental models of machine learning. C1 to C3 are the original activity, unchanged.

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
│   │   │   └── collection/
│   │   │       └── route.ts     # Collects experimental data
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
├── scripts/                     # Utility scripts (for backend setup mainly)
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

Quicker for testing: the start page has two tabs. "Élèves" is where groups enter their keys (the default, used in class). "Tester une condition" shows the new activities (C4 to C7) as a 2×2 grid and the original activity (C1 to C3, kept as the reference), each card saying what is visible; one click starts that condition with its developer keys (group "dev"). After the choice, a "Mode test" badge names the condition and "Changer" goes back.

### Conditions C4 to C7 (same actions, different transparency)

C4 to C7 were added for the exploratory mental-model study. They form a 2×2: the data preparation is shown (C4, C6) or hidden (C5, C7), and the model is revealed after the guess (C5, C6) or stays closed (C4, C7). The table below describes C4 and C5; C6 does C4's data steps followed by C5's model and evaluation, and C7 does C5's data steps followed by C4's model and evaluation. Nobody labels or picks features: an "archaeologist team" prepared the data (`app/lib/fixedData.ts`). All four conditions train on exactly the same labels and features with the same greedy Gini algorithm, so they get the same tree. Students perform the same actions; only what they see differs.

| Step | C4 (data shown, model hidden) | C5 (data hidden, model shown) |
|---|---|---|
| Data labelling | Read the 10 sheets, with the dinosaur's drawing next to the sheet; each card shows the archaeologists' label and their reason | Read the 10 sheets, with the drawing; no labels shown |
| Data preparation | Labelled table and the 4 chosen features with the team's reason; answer "Explique à un ami ce que l'ordinateur va recevoir pour apprendre." | Only "the data has been prepared"; same question |
| Model training | Hidden tree; press Entraîner, then Suite opens a separate page where they see what it predicted for each training dinosaur (table, no labels), then tick the features they think it uses, pick the most important one and optionally say why | Same task (page 1/3), then "Ouvrir le modèle" leads to two more full-screen pages: 2/3 the tree's questions next to their guess (which features they ticked vs which the tree really uses), then following a dinosaur; 3/3 opens with the Gini explanation, then the same tree, where clicking a question shows its Gini impurity. "Retour" goes back; the guess is locked once the model is opened. No tables with labels |
| Evaluation | New dinosaurs one card at a time (data, the closed model's prediction, real diet), then a page to calculate accuracy, then a page with the two reflection questions | Same, but each card also shows the dinosaur's path down the tree |

In C5 and C6 the revealed tree is drawn like C1's tree: question cards with NON/OUI buttons, connector lines, and the path of the selected dinosaur in blue (`app/modelling/ModelReveal.tsx`).

One archaeologist label is deliberately wrong (`MISLABELLED_DINO` in `app/lib/fixedData.ts`, default Styracosaurus labelled carnivore). Set it to `null` for correct labels only. With the default features (bipède, longueur, poids, période) the tree gets 100% on training and 30% on the test set; with no wrong label, 50%.

The feature guess is saved in `BBModellingAnswers` (C4 to C7), and `TrainedTree` (C5 and C6, saved when the model is opened); the answer to the data-preparation question is saved in `FeatureSelectionReason`.

Participant keys: C4 group 1 `921, 534, 267`, group 2 `418, 893, 652`; C5 group 1 `731, 146, 395`, group 2 `587, 812, 269`; C6 group 1 `643, 358, 972`, group 2 `415, 786, 239`; C7 group 1 `527, 864, 193`, group 2 `346, 615, 958`.

C1, C2 and C3 are unchanged.

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
