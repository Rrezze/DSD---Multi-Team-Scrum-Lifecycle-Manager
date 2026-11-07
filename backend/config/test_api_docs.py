from django.test import TestCase


class ApiDocsTests(TestCase):
    def test_openapi_schema_is_available(self):
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 200)

    def test_swagger_docs_page_is_available(self):
        response = self.client.get("/api/docs/")
        self.assertEqual(response.status_code, 200)
