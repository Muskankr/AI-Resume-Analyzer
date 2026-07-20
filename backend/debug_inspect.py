from unittest.mock import patch
from analyzer.services import analyze_resume

class _FakePage:
    def __init__(self, text):
        self._text = text
    def extract_text(self):
        return self._text

class _FakePDF:
    def __init__(self, text):
        self.pages = [_FakePage(text)]
    def __enter__(self):
        return self
    def __exit__(self, *exc):
        return False

with patch('analyzer.services.pdfplumber.open', return_value=_FakePDF('Experienced with Python and Django.')):
    result = analyze_resume('dummy.pdf', 'Frontend Developer', job_description='Need Python, React, and Django experience.')
    print(result)
