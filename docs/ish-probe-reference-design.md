# ISH Probe — Reference Hardware Architecture

This document defines the engineering target for a future ISH-branded ultrasound probe. It is a reference architecture, not a claim that a medical-grade probe has already been manufactured or validated.

## Probe electronics

`Transducer array -> T/R switch -> analog front-end -> ADC -> beamforming/reconstruction -> image packetizer -> USB/Wi-Fi`

A separate low-power controller provides:

`BLE -> pairing / device identity / battery / temperature / configuration / telemetry`

The probe must expose a documented frame format containing at minimum:

- frame sequence
- acquisition timestamp
- width / height
- pixel format
- depth / scale metadata
- probe mode
- center frequency / bandwidth where applicable
- gain/TGC metadata
- device identity
- calibration information

## Safety-critical hardware

The actual transducer, acoustic output, electrical isolation, temperature limits, EMC, mechanical enclosure, sterilization/coupling workflow and patient-contact materials require dedicated medical-device engineering and verification. They must not be replaced by software assumptions.

## Connectivity

USB is the baseline wired transport. Wi-Fi is the preferred high-throughput wireless image transport. BLE is the control/telemetry channel unless a validated vendor protocol demonstrates another role.

## Software integration

The desktop application integrates probes through `probe/manager.mjs`. Vendor-specific SDK/protocol adapters should be added without modifying the core clinical pipeline.

## Development sequence

1. Build a non-patient-connected electronics prototype.
2. Validate acquisition on an ultrasound phantom.
3. Implement and document the frame protocol.
4. Implement USB/Wi-Fi/BLE adapters.
5. Validate image quality and latency.
6. Build anatomical localization/segmentation models using appropriately licensed datasets.
7. Perform verification and clinical validation before any diagnostic claim.
