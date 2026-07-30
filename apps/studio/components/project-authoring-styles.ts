export const projectAuthoringCss = String.raw`
  .project-authoring {
    --authoring-canvas: #f2f5f4;
    --authoring-surface: #ffffff;
    --authoring-raised: #e8eeec;
    --authoring-text: #172024;
    --authoring-muted: #53646b;
    --authoring-border: #b9c7c5;
    --authoring-border-strong: #637770;
    --authoring-accent: #087d74;
    --authoring-focus: #8d4d00;
    display: grid;
    overflow-x: hidden;
    min-width: 0;
    grid-template-columns: minmax(30rem, 1.05fr) minmax(25rem, 0.95fr);
    border: 1px solid var(--authoring-border);
    border-radius: 0.5rem;
    background: var(--authoring-canvas);
    color: var(--authoring-text);
    color-scheme: light;
  }

  .project-authoring[data-authoring-theme="dark"] {
    --authoring-canvas: #0b1014;
    --authoring-surface: #11181e;
    --authoring-raised: #172129;
    --authoring-text: #edf2f3;
    --authoring-muted: #a8b6bb;
    --authoring-border: #314149;
    --authoring-border-strong: #60737b;
    --authoring-accent: #46d5c5;
    --authoring-focus: #ffcb68;
    color-scheme: dark;
  }

  .project-authoring__editor,
  .project-authoring__preview {
    min-width: 0;
    background: var(--authoring-surface);
  }

  .project-authoring__editor {
    padding: clamp(1rem, 2vw, 1.5rem);
  }

  .project-authoring__preview {
    position: sticky;
    top: 0;
    align-self: start;
    min-height: min(70vh, 48rem);
    border-left: 1px solid var(--authoring-border);
  }

  .project-authoring__toolbar {
    position: sticky;
    z-index: 2;
    top: 0;
    display: flex;
    min-height: 3.5rem;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--authoring-border);
    background: var(--authoring-surface);
  }

  .project-authoring__toolbar > div:first-child {
    display: grid;
    min-width: 0;
    gap: 0.15rem;
  }

  .project-authoring__toolbar span {
    overflow: hidden;
    color: var(--authoring-muted);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-authoring__controls {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.35rem;
  }

  .project-authoring__toolbar button,
  .project-authoring__open-preview {
    display: inline-flex;
    min-width: 2.75rem;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--authoring-border-strong);
    border-radius: 0.25rem;
    background: transparent;
    color: var(--authoring-text);
    font: inherit;
    font-size: 0.75rem;
    text-decoration: none;
  }

  .project-authoring__toolbar button[aria-pressed="true"] {
    border-color: var(--authoring-accent);
    background: var(--authoring-accent);
    color: var(--authoring-canvas);
    font-weight: 700;
  }

  .project-authoring__toolbar button:focus-visible,
  .project-authoring__open-preview:focus-visible,
  .project-authoring iframe:focus-visible {
    outline: 3px solid var(--authoring-focus);
    outline-offset: 2px;
  }

  .project-authoring__form {
    padding-top: 1rem;
  }

  .project-authoring__pair {
    margin-block: 0.25rem 1rem;
    padding: 0.75rem;
    border: 1px solid var(--authoring-border);
    border-radius: 0.35rem;
    background: var(--authoring-raised);
  }

  .project-authoring__pair-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.6rem;
    color: var(--authoring-muted);
    font-size: 0.75rem;
  }

  .project-authoring__pair-status strong {
    color: var(--authoring-accent);
  }

  .project-authoring__preview iframe {
    display: block;
    width: 100%;
    min-height: min(70vh, 48rem);
    border: 0;
    background: #ffffff;
  }

  .project-authoring__preview-status {
    padding: 1rem;
    color: var(--authoring-muted);
  }

  @media (max-width: 70rem) {
    .project-authoring {
      grid-template-columns: minmax(0, 1fr);
    }

    .project-authoring__preview {
      position: relative;
      margin-top: 1rem;
      border-bottom: 1px solid var(--authoring-border);
      border-left: 0;
    }
  }

  @media (max-width: 36rem) {
    .project-authoring__toolbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .project-authoring__controls {
      width: 100%;
      flex-wrap: wrap;
    }

    .project-authoring__controls button {
      flex: 1;
    }
  }
`;
