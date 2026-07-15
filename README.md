# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Tutorial for installing vite

### Step 1: Create the React Project

### 1. Initialize a new project with Vite (much faster than create-react-app)
npm create vite@latest local-xml-editor -- --template react

### 2. Navigate inside the newly created project folder
cd local-xml-editor

### 3. Install the default starter dependencies
npm install

### Step 2: Install UI and XML Libraries

npm install antd @ant-design/icons fast-xml-parser

### Step 3: Implement the Application Code

Open the file src/App.jsx.
Delete everything inside it.
Paste the following complete, working code into src/App.jsx

### Step 4: Run the Application

npm run dev