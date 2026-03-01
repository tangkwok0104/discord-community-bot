# Precise Firebase Hosting Deployment Guide

To deploy the dashboard, follow these exact steps in your terminal. This process takes your React code, turns it into a highly optimized static website, and pushes it to Google's global servers.

### Step 1: Open the Correct Directory
You must execute these commands from inside the `dashboard` folder, not the root of the project.
Open a terminal and run:
```bash
cd "/Users/kwoktang/All Building Projects/discord-community-bot/dashboard"
```

### Step 2: Authenticate with Firebase
You need to prove to Firebase that you own the project.
```bash
firebase login
```
* **What happens:** This will open a browser window asking you to log in with your Google account. 
* **Action:** Choose the Google account (`kwoktang328@gmail.com`) associated with your Firebase project and click "Allow". Once the terminal says "Success! Logged in as...", return to the terminal.

### Step 3: Initialize Firebase Hosting
We must tell Firebase that this specific folder contains a website that needs hosting.
```bash
firebase init hosting
```
You will be prompted with a series of questions. Use your arrow keys to move up/down and the `Enter` key to select.

Here is exactly how to answer them:

1. **"Are you ready to proceed?"** 
   * Type `Y` and press Enter.
2. **"Please select an option:"** 
   * Use arrow keys to select `Use an existing project` and press Enter.
3. **"Select a default Firebase project for this directory:"** 
   * Select `discord-community-bot-f9428` and press Enter.
4. **"What do you want to use as your public directory?"** 
   * Type `dist` and press Enter. *(This is crucial. Vite compiles our code into a folder named `dist`)*.
5. **"Configure as a single-page app (rewrite all urls to /index.html)?"** 
   * Type `y` and press Enter. *(React routing requires this)*.
6. **"Set up automatic builds and deploys with GitHub?"** 
   * Type `N` and press Enter. *(We are doing manual deploys for now)*.
7. **"File dist/index.html already exists. Overwrite?"** 
   * Type `N` and press Enter.

### Step 4: Build the Application
Right now, your code is written in React (JSX) which browsers don't fully understand natively. We need Vite to compile it down to pure, optimized HTML, CSS, and Javascript.
```bash
npm run build
```
* **What happens:** You will see Vite process your files and create a new folder called `dist/`. This represents your final production website.

### Step 5: Deploy to the World!
Finally, send the compiled `dist/` folder up to Firebase servers.
```bash
firebase deploy --only hosting
```
* **What happens:** The terminal will show the files uploading. At the very end, it will output a **Hosting URL** (e.g., `https://discord-community-bot-f9428.web.app`).

Click that URL, and your dashboard is officially live on the internet! 

Whenever you make changes to the code in the future, you just need to repeat **Step 4** (`npm run build`) and **Step 5** (`firebase deploy`).
