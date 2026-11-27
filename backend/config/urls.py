from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("tickets.urls")),
    path("api/", include("teams.urls")),
    path("api/", include("users.urls")),
    path("api/", include("sprints.urls")),
    # OpenAPI schema and interactive API docs (Swagger UI)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]
