# Computer Rhythm

Professional synthesized drum machine and MIDI sequencer with AI-powered pattern generation.

## MIDI Setup (macOS)

To route MIDI from this browser application to other software (like Ableton Live, Logic Pro, or GarageBand), follow these steps to enable the built-in virtual MIDI bus:

1.  **Enable the IAC Driver**:
    *   Open **Audio MIDI Setup** (found in `/Applications/Utilities` or via Spotlight).
    *   Go to the top menu: **Window > Show MIDI Studio**.
    *   Find the **IAC Driver** icon and double-click it.
    *   Check the box **"Device is online"** and click **Apply**.
2.  **Configure your DAW**:
    *   Open your music software and go to its MIDI Preferences.
    *   Look for **"IAC Driver Bus 1"** in the Input list and enable it (ensure "Track" or "Remote" is checked).
3.  **In the Application**:
    *   Ensure the **MIDI Out** button in the control bar is active (blue).
    *   The app will now send MIDI notes to the IAC Driver, which your DAW will receive.

**Note:** Use **Google Chrome** or **Microsoft Edge** for the best experience, as Safari has limited Web MIDI support.

## Features

- **Polymetric Sequencing**: Set independent loop lengths for every track.
- **AI Composer**: Generate rhythms using natural language prompts.
- **Synth Engine**: Built-in synthesis with effects (Reverb, Delay, Distortion, etc.).
- **Sample Support**: Drag and drop your own audio files.
- **Real-time Recording**: Export your loops as high-quality WAV files.
