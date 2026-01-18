import { InputState } from '../types';
import { DataRecorder } from './dataRecorder';

/**
 * INPUT AND PLATFORM ORIENTATION CONTROL MODULE
 * 
 * Responsibilities:
 * - Read from Gamepad API
 * - Normalize values
 * - Map to Pitch/Roll/Yaw
 * - Designed to be swapped for custom hardware signals later
 * - ADDED vJoy SUPPORT FOR CUSTOM CONTROLLERS
 * - ADDED WRIST ROTATION CONTROL FOR BALL SPEED
 */

export class InputController {
  private static instance: InputController;
  private gamepadIndex: number | null = null;
  private vJoyDeviceId: string | null = null; // ADDED FOR vJoy SUPPORT
  private dataRecorder: DataRecorder;

  // Sensitivity settings
  private readonly MAX_TILT = Math.PI / 6; // 30 degrees max tilt
  private readonly ROTATION_SPEED = 0.05; // Smoothing factor

  // vJoy specific settings (ADDED)
  private readonly VJOY_DEADZONE = 0.05;
  private readonly VJOY_SENSITIVITY = 1.2;

  // // Wrist rotation control settings (ADDED)
  // private readonly WRIST_ROTATION_DEADZONE = 0.1;
  // private readonly WRIST_ROTATION_SENSITIVITY = 2.0;
  
  private currentState: InputState = {
    pitch: 0,
    roll: 0,
    yaw: 0
  };
  
  // // ADDED: Wrist rotation state
  // private wristRotationState = {
  //   leftWrist: 0,  // LT button value (0-1)
  //   rightWrist: 0, // RT button value (0-1)
  //   speedMultiplier: 1.0 // Current speed multiplier
  // };

  private constructor() {
    this.dataRecorder = DataRecorder.getInstance();
    
    (window as any).addEventListener("gamepadconnected", (e: any) => {
      console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
      
      // ADDED vJoy detection and priority handling
      const isVJoy = this.isVJoyDevice(e.gamepad.id);
      console.log(`Device detection - ID: "${e.gamepad.id}", Is vJoy: ${isVJoy}`);
      
      if (!isVJoy) {
        // Standard gamepad - priority 1
        if (this.gamepadIndex === null) {
          this.gamepadIndex = e.gamepad.index;
          this.vJoyDeviceId = null;
        }
      } else if (this.gamepadIndex === null) {
        // vJoy device - priority 2 (only if no standard gamepad)
        this.gamepadIndex = e.gamepad.index;
        this.vJoyDeviceId = e.gamepad.id;
      }
    });

    (window as any).addEventListener("gamepaddisconnected", (e: any) => {
      if (this.gamepadIndex === e.gamepad.index) {
        console.log(`Gamepad disconnected: "${e.gamepad.id}"`);
        this.gamepadIndex = null;
        this.vJoyDeviceId = null;
        this.autoSelectDevice(); // ADDED: Auto-select new device
      }
    });
  }

  public static getInstance(): InputController {
    if (!InputController.instance) {
      InputController.instance = new InputController();
    }
    return InputController.instance;
  }

  /**
   * Get current device information
   */
  public getDeviceInfo(): { type: string, id: string | null, index: number | null } {
    if (this.gamepadIndex !== null) {
      const nav = navigator as any;
      const gamepads = nav.getGamepads ? nav.getGamepads() : [];
      const gamepad = gamepads[this.gamepadIndex];
      
      if (gamepad) {
        const isVJoy = this.isVJoyDevice(gamepad.id);
        return {
          type: isVJoy ? 'vJoy' : 'Gamepad',
          id: gamepad.id,
          index: this.gamepadIndex
        };
      }
    }
    
    return {
      type: 'None',
      id: null,
      index: null
    };
  }

  /**
   * List all available devices
   */
  public listAvailableDevices(): Array<{index: number, id: string, type: string}> {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    const availableDevices = [];
    
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        const gamepad = gamepads[i];
        const isVJoy = this.isVJoyDevice(gamepad.id);
        availableDevices.push({
          index: i,
          id: gamepad.id,
          type: isVJoy ? 'vJoy' : 'Gamepad'
        });
      }
    }
    
    return availableDevices;
  }

  /**
   * Switch to a specific device by index
   */
  public switchToDevice(index: number): void {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    
    if (gamepads[index]) {
      const gamepad = gamepads[index];
      const isVJoy = this.isVJoyDevice(gamepad.id);
      
      this.gamepadIndex = index;
      this.vJoyDeviceId = isVJoy ? gamepad.id : null;
      
      console.log(`Switched to device at index ${index}: ${gamepad.id} (${isVJoy ? 'vJoy' : 'Gamepad'})`);
    }
  }

  /**
   * Detect if the device is a vJoy virtual controller
   */
  private isVJoyDevice(deviceId: string): boolean {
    const lowerId = deviceId.toLowerCase();
    return lowerId.includes('vjoy') || 
           lowerId.includes('virtual') ||
           lowerId.includes('joystick') ||
           lowerId.includes('feed') ||
           lowerId.includes('face') ||
           lowerId.includes('unknown') ||
           lowerId.includes('hid') ||
           lowerId.includes('usb') ||
           /vjoy.*device/i.test(deviceId) ||
           /virtual.*joystick/i.test(deviceId);
  }

  /**
   * Auto-select the best available device (ADDED)
   */
  private autoSelectDevice(): void {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    const availableGamepads = gamepads.filter(gp => gp);
    
    if (availableGamepads.length === 0) return;
    
    // Priority: Standard gamepad > vJoy
    const standardGamepad = availableGamepads.find(gp => !this.isVJoyDevice(gp.id));
    if (standardGamepad) {
      this.gamepadIndex = standardGamepad.index;
      this.vJoyDeviceId = null;
    } else {
      const vJoyGamepad = availableGamepads.find(gp => this.isVJoyDevice(gp.id));
      if (vJoyGamepad) {
        this.gamepadIndex = vJoyGamepad.index;
        this.vJoyDeviceId = vJoyGamepad.id;
      }
    }
  }

  /**
   * Get the appropriate deadzone based on device type (ADDED)
   */
  private getDeadzone(): number {
    return this.vJoyDeviceId ? this.VJOY_DEADZONE : 0.1;
  }

  /**
   * Get the appropriate sensitivity based on device type (ADDED)
   */
  private getSensitivity(): number {
    return this.vJoyDeviceId ? this.VJOY_SENSITIVITY : 1.0;
  }

  /**
   * Get wrist rotation state (ADDED)
   */
  // public getWristRotation(): { leftWrist: number, rightWrist: number, speedMultiplier: number } {
  //   return this.wristRotationState;
  // }

  /**
   * Polls the current input device and returns the platform orientation.
   * Currently implements Xbox-style controller mapping.
   * ADDED vJoy device handling
   * ADDED Wrist rotation control for ball speed
   */
  public getOrientation(): InputState {
    const nav = navigator as any;
    const gamepads = nav.getGamepads ? nav.getGamepads() : [];
    
    if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
      const gp = gamepads[this.gamepadIndex];
      if (gp) {
        // ADDED: Device type detection
        const isVJoy = this.vJoyDeviceId !== null;
        const deadzone = this.getDeadzone();
        const sensitivity = this.getSensitivity();

        // vJoy axis mapping (X,Y,Z axes)
        let rawRoll, rawPitch, rawYaw;
        if (isVJoy) {
          rawRoll = gp.axes[0] || 0;   // X-axis -> Roll
          rawPitch = gp.axes[1] || 0;  // Y-axis -> Pitch
          rawYaw = gp.axes[2] || 0;    // Z-axis -> Yaw
        } else {
          // Standard gamepad mapping (unchanged)
          rawRoll = gp.axes[0] || 0;
          rawPitch = gp.axes[1] || 0;
          rawYaw = 0;
          if (gp.buttons[6] && gp.buttons[7]) {
            rawYaw = (gp.buttons[7].value - gp.buttons[6].value);
          }
        }

        // Apply deadzone
        const roll = Math.abs(rawRoll) < deadzone ? 0 : rawRoll;
        const pitch = Math.abs(rawPitch) < deadzone ? 0 : rawPitch;
        const yaw = Math.abs(rawYaw) < deadzone ? 0 : rawYaw;

        // Apply sensitivity and mapping
        const tiltMultiplier = this.MAX_TILT * sensitivity;
        
        this.currentState = {
            roll: -roll * tiltMultiplier,
            pitch: pitch * tiltMultiplier,
            yaw: yaw * tiltMultiplier
        };

        // // ADDED: Wrist rotation control for ball speed
        // this.updateWristRotation(gp);

        // Record input data (unchanged)
        this.dataRecorder.recordInput(this.currentState);
      }
    } else {
        // Fallback (unchanged)
    }

    return this.currentState;
  }

  /**
   * Update wrist rotation state based on Xbox controller triggers (ADDED)
   * LT (Left Trigger) -> Left wrist rotation -> Decrease ball speed
   * RT (Right Trigger) -> Right wrist rotation -> Increase ball speed
   */
  // private updateWristRotation(gamepad: Gamepad): void {
  //   // Xbox controller trigger mapping:
  //   // LT (Left Trigger) = button 6 (index 6)
  //   // RT (Right Trigger) = button 7 (index 7)
  //   const leftTrigger = gamepad.buttons[6]?.value || 0;
  //   const rightTrigger = gamepad.buttons[7]?.value || 0;

  //   // Apply deadzone to wrist rotation
  //   const leftWrist = leftTrigger > this.WRIST_ROTATION_DEADZONE ? leftTrigger : 0;
  //   const rightWrist = rightTrigger > this.WRIST_ROTATION_DEADZONE ? rightTrigger : 0;

  //   // Calculate speed multiplier based on wrist rotation
  //   // Left wrist rotation (LT) decreases speed (0.5x to 1.0x)
  //   // Right wrist rotation (RT) increases speed (1.0x to 2.0x)
  //   let speedMultiplier = 1.0;
    
  //   if (leftWrist > 0) {
  //     // Left wrist rotation: decrease speed (0.5x to 1.0x)
  //     speedMultiplier = 1.0 - (leftWrist * 0.5);
  //   } else if (rightWrist > 0) {
  //     // Right wrist rotation: increase speed (1.0x to 2.0x)
  //     speedMultiplier = 1.0 + (rightWrist * 1.0);
  //   }

  //   // Smooth the transition
  //   const smoothingFactor = 0.1;
  //   this.wristRotationState.speedMultiplier = 
  //     this.wristRotationState.speedMultiplier * (1 - smoothingFactor) + 
  //     speedMultiplier * smoothingFactor;

  //   this.wristRotationState.leftWrist = leftWrist;
  //   this.wristRotationState.rightWrist = rightWrist;

  //   // Log wrist rotation state for debugging
  //   if (leftWrist > 0.1 || rightWrist > 0.1) {
  //     console.log(`Wrist Rotation - LT: ${leftWrist.toFixed(2)}, RT: ${rightWrist.toFixed(2)}, Speed: ${this.wristRotationState.speedMultiplier.toFixed(2)}x`);
  //   }
  // }

  // Existing methods remain UNCHANGED:
  public async startDataRecording(): Promise<boolean> {
    return this.dataRecorder.startRecording();
  }

  public async stopDataRecording(): Promise<boolean> {
    return this.dataRecorder.stopRecording();
  }

  public isDataRecording(): boolean {
    return this.dataRecorder.isRecordingActive();
  }

  public isDataRecorderConnected(): boolean {
    return this.dataRecorder.isConnected();
  }
}