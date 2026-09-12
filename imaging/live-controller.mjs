import {LiveUltrasoundPipeline} from './pipeline.mjs';
import {assessFrameQuality} from './quality.mjs';
import {createRegistrationState, updateRegistration, registrationOverlay} from './anatomy-registration.mjs';

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
    const overlay = registrationOverlay(this.registration, result?.frame?.timestamp ?? Date.now());
    return {...result, registration:this.registration, registrationOverlay:overlay};
  }
}
