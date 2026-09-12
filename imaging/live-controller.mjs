import {LiveUltrasoundPipeline} from './pipeline.mjs';
import {assessFrameQuality} from './quality.mjs';
import {createRegistrationState, updateRegistration, registrationOverlay} from './anatomy-registration.mjs';
import {mapUltrasoundFinding, atlasOverlayGate} from './atlas-mapping.mjs';

export class LiveImagingController {
  constructor({anatomyLocator, clinicalEngine, temporalWindow = 30, calibration = null, atlasCatalog = []} = {}) {
    this.registration = createRegistrationState();
    this.calibration = calibration;
    this.atlasCatalog = Array.isArray(atlasCatalog) ? atlasCatalog : [];
    this.pipeline = new LiveUltrasoundPipeline({
      quality: async frame => assessFrameQuality(frame),
      anatomy: async (frame, quality) => anatomyLocator ? anatomyLocator(frame, quality) : {status:'NOT_CONFIGURED', reason:'ANATOMICAL_LOCALIZER_REQUIRED'},
      clinical: async payload => clinicalEngine ? clinicalEngine(payload) : {status:'NOT_CONFIGURED', findings:[], diagnosticCandidates:[], reason:'CLINICAL_ENGINE_REQUIRED'},
      calibration
    });
    if (temporalWindow !== 30) this.pipeline.temporalTracker.windowSize = temporalWindow;
  }

  start(session) {
    this.registration = createRegistrationState();
    return this.pipeline.start(session);
  }

  stop() { return this.pipeline.stop(); }
  onResult(listener) { return this.pipeline.onResult(listener); }

  async push(frame) {
    const result = await this.pipeline.push(frame);
    if (result?.anatomy?.structureId) {
      this.registration = updateRegistration(this.registration, result.anatomy, result?.frame?.timestamp ?? Date.now());
    }
    const registrationOverlayResult = registrationOverlay(this.registration, result?.frame?.timestamp ?? Date.now());
    const atlasMapping = result?.anatomy?.structureId
      ? mapUltrasoundFinding({structureId:result.anatomy.structureId,confidence:result.anatomy.confidence,transform:result.anatomy.transform,plane:result.anatomy.plane}, this.atlasCatalog)
      : {status:'INVALID',reason:'STRUCTURE_ID_REQUIRED'};
    const atlasOverlay = atlasOverlayGate(atlasMapping, {
      registrationStatus:this.registration.status,
      calibrated:Boolean(result?.calibration?.overlayAllowed),
      qualityStatus:result?.quality?.status ?? 'UNKNOWN'
    });
    return {...result, registration:this.registration, registrationOverlay:registrationOverlayResult, atlasMapping, atlasOverlay};
  }
}
