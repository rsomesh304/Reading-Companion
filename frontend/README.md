# React + Vite

## Help & Support

Help navigation exposes **New chat**, **Chat history**, and **App tour** directly.
Chat history opens in a searchable dialog (a bottom sheet on mobile), grouped by
date with the newest conversations first. Search matches questions and answers.
Saved conversations are read-only; returning to the current chat preserves its
messages and draft. Deleting one conversation or clearing history requires
confirmation and does not remove the current conversation.

Up to 30 help conversations are stored on the current device only, not in cloud
backups. Tour progress is preserved, so the tour action can resume an unfinished
tour. While a reply is being generated, starting a new chat or tour is disabled.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
