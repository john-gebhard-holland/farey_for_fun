# Wobble Overlay with TrackIR Support 🏍️🦈

This application creates a full-screen overlay that applies a 3D wobble effect to your screen content, with TrackIR support for enhanced immersion.

## Features

- Full-screen always-on-top overlay
- Real-time screen capture with OpenGL shader effects
- TrackIR mouse position tracking
- Dynamic wobble effect that responds to mouse movement
- Smooth performance with hardware acceleration

## Requirements

- Python 3.7+
- TrackIR device (or any mouse input device)
- OpenGL 3.3+ compatible graphics card

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Make sure your TrackIR software is running and properly configured.

## Usage

1. Run the application:
```bash
python wobble_overlay.py
```

2. The overlay will start automatically and apply the wobble effect to your screen.

3. Move your TrackIR device (or mouse) to see the effect respond to your movements.

4. Press ESC to exit the application.

## Customization

You can modify the wobble effect by adjusting the parameters in the `FRAGMENT_SHADER`:
- Change the wobble intensity by modifying the `0.02` multiplier
- Adjust the wobble frequency by changing the `10.0` multiplier
- Modify the mouse influence by changing the `0.1` multiplier

## Troubleshooting

- If the overlay doesn't appear, make sure no other full-screen applications are running
- If the effect is too intense, try reducing the multipliers in the shader code
- If you experience performance issues, try closing other GPU-intensive applications 