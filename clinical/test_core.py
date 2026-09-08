import unittest

from core import AssessmentStatus, ClinicalEvidence, DiagnosticEngine


class DiagnosticEngineTests(unittest.TestCase):
    def test_empty_case_is_insufficient(self):
        result = DiagnosticEngine().assess(symptoms=[], observations=[])
        self.assertEqual(result.status, AssessmentStatus.INSUFFICIENT_DATA)

    def test_unconfigured_model_never_fabricates_diagnosis(self):
        evidence = ClinicalEvidence(
            source_id="local-test",
            observation="example observation",
            value=True,
            provenance="test",
            confidence=0.9,
        )
        result = DiagnosticEngine().assess(symptoms=["example symptom"], observations=[evidence])
        self.assertEqual(result.status, AssessmentStatus.NOT_CONFIGURED)
        self.assertEqual(result.differential, [])
        self.assertEqual(result.evidence[0].source_id, "local-test")


if __name__ == "__main__":
    unittest.main()
