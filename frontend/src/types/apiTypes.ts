export interface ApiErrorResponse {
    detail?: string;
    message?: string;
    [field: string]: unknown;
}