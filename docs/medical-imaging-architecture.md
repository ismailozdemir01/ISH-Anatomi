# ISH-Anatomi Medical Imaging Architecture

## Scope

ISH-Anatomi now contains a real-time ultrasound integration core designed for actual probe data. The core does not manufacture frames, measurements, anatomy matches, or diagnoses when a real device/model is unavailable.

## Transports

- USB: preferred wired high-bandwidth path.
- Wi-Fi: preferred wireless image transport when supported by the probe vendor.
- Bluetooth LE: probe discovery, pairing, identity, telemetry and control. It is not assumed to carry raw ultrasound video unless a specific vendor protocol proves that capability.

## Live pipeline

`Probe -> acquisition -> frame validation -> quality gate -> anatomical localization -> 2D/3D registration -> temporal tracking -> clinical reasoning -> 3D UI`

Every frame is processed as a time-stamped object. The pipeline maintains session state and can continuously publish analysis results to the Electron desktop UI.

## Device adapter contract

A physical probe is integrated through a transport adapter with:

- stable probe ID
- transport type
- connect/disconnect
- telemetry
- capabilities
- frame source

The repository deliberately does not pretend to support a vendor's proprietary ultrasound wire protocol without its specification. A real vendor adapter must be implemented against the manufacturer's documented SDK/protocol or an interoperable standard.

## Medical-device boundary

The current software implements the acquisition/pipeline/registration interfaces and explicit `NOT_CONFIGURED`, `NO_SIGNAL`, `INSUFFICIENT`, and `UNKNOWN` states. It is not a clinically validated diagnostic device merely because it can process images.

If the product is marketed to diagnose disease, the ultrasound hardware, software lifecycle, risk management, verification/validation, clinical performance and regulatory pathway must be handled as a medical-device program. FDA recognizes IEC 62304 for medical-device software lifecycle processes and has recognized ultrasound-specific standards including IEC 60601-2-37, IEC 61391-2 and IEC 62359. DICOM is the interoperability target for medical imaging data where applicable.

## No external AI API

The architecture is local-first. No external AI provider is required for the imaging pipeline. A future local inference adapter may be plugged into segmentation/anatomical localization/clinical reasoning only after its model, license, validation dataset and performance characteristics are documented.
