package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type apiError struct {
	Status  int               `json:"-"`
	Code    string            `json:"code,omitempty"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

func (e *apiError) Error() string { return e.Message }

func errBadRequest(msg string, fields map[string]string) *apiError {
	return &apiError{Status: http.StatusBadRequest, Code: "VALIDATION", Message: msg, Fields: fields}
}
func errUnauthorized(msg string) *apiError {
	return &apiError{Status: http.StatusUnauthorized, Code: "UNAUTHORIZED", Message: msg}
}
func errForbidden(msg string) *apiError {
	return &apiError{Status: http.StatusForbidden, Code: "FORBIDDEN", Message: msg}
}
func errNotFound(msg string) *apiError {
	return &apiError{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: msg}
}
func errConflict(code, msg string, fields map[string]string) *apiError {
	return &apiError{Status: http.StatusConflict, Code: code, Message: msg, Fields: fields}
}

type validation map[string]string

func (v validation) add(field, msg string) {
	if _, ok := v[field]; !ok {
		v[field] = msg
	}
}
func (v validation) err() error {
	if len(v) == 0 {
		return nil
	}
	return errBadRequest("Проверьте заполнение полей.", v)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func (s *Server) fail(w http.ResponseWriter, r *http.Request, err error) {
	var ae *apiError
	if errors.As(err, &ae) {
		writeJSON(w, ae.Status, ae)
		return
	}
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, errNotFound("Не найдено."))
		return
	}
	var pg *pgconn.PgError
	if errors.As(err, &pg) {
		switch pg.Code {
		case "23505":
			writeJSON(w, http.StatusConflict, errConflict("CONFLICT", "Такая запись уже существует.", nil))
			return
		case "23503":
			writeJSON(w, http.StatusBadRequest, errBadRequest("Связанная запись не найдена или не относится к проекту.", nil))
			return
		case "23514", "22001", "22007", "22P02":
			writeJSON(w, http.StatusBadRequest, errBadRequest("Некорректные данные.", nil))
			return
		}
	}
	if errors.Is(err, r.Context().Err()) {
		return
	}
	s.log.Error("request failed", "method", r.Method, "path", r.URL.Path, "error", err)
	writeJSON(w, http.StatusInternalServerError, &apiError{Code: "INTERNAL", Message: "Что-то пошло не так. Попробуйте ещё раз."})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		return errBadRequest("Некорректный JSON в теле запроса.", nil)
	}
	return nil
}
