import {LiveUltrasoundPipeline} from './pipeline.mjs';
import {assessFrameQuality} from './quality.mjs';
import {createRegistrationState, updateRegistration} from './anatomy-registration.mjs';

export class LiveImagingController {
  constructor({anatomyLocator, clinicalEngine} = {}) {
    this.registration = createRegistrationState();
    this.pipeline = new LiveUltrasoundPipeline({
      quality: async frame => assessFrameQuality(frame),
      anatomy: async (frame, quality) => anatomyLocator ? anatomyLocator(frame, quality) : {status:'NOT_CONFIGURED', reason:'ANATOMICAL_LOCALIZER_REQUIRED'},
      clinical: async payload => clinicalEngine ? clinicalEngine(payload) : {status:'NOT_CONFIGURED', findings:[], diagnosticCandidates:[], reason:'CLINICAL_ENGINE_REQUIRED'}
    });
  }

  start(session) { return this.pipeline.start(session); }
  stop() { return this.pipeline.stop(); }
  onResult(listener) { return this.pipeline.onResult(listener); }

  async push(frame) {
    const result = await this.pipeline.push(frame);
    if (result?.anatomy?.structureId) this.registration = updateRegistration(this.registration, result.anatomy);
    return {...result, registration:this.registration};
  }
}
