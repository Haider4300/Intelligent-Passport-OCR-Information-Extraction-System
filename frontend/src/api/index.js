// src/api/index.js
// =================
// All backend API calls live here.
// This keeps network logic OUT of components.
//
// Rule: components call these functions, they don't use fetch/axios directly.
// This makes it easy to change the API URL in one place.

import axios from 'axios'

// Base URL — empty string means "same origin" (Vite proxy handles it)
// In development: Vite proxies /api → http://localhost:8000/api
const api = axios.create({
  baseURL: '',
  timeout: 120000,  // 2-minute timeout — OCR can be slow on first run
})


// ── Health Check ──────────────────────────────────────────────────────────────
/**
 * Check if the backend is alive and models are loaded.
 * Returns: { status, yolo_loaded, message }
 */
export async function checkHealth() {
  const response = await api.get('/health')
  return response.data
}


// ── Extract Passport Data ─────────────────────────────────────────────────────
/**
 * Upload a passport image file and get extracted data back.
 *
 * @param {File} imageFile - The File object from the file input / drag-drop
 * @param {Function} onProgress - Optional callback: receives upload % (0-100)
 * @returns {Object} OCR result with passport_number, name, dob, nationality, etc.
 */
export async function extractPassport(imageFile, onProgress) {
  // FormData is how we send files over HTTP
  const formData = new FormData()
  formData.append('file', imageFile)  // 'file' must match the FastAPI parameter name

  const response = await api.post('/api/extract', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Track upload progress (the OCR happens server-side after upload)
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
        onProgress(percent)
      }
    },
  })

  return response.data
}


// ── Get History ───────────────────────────────────────────────────────────────
/**
 * Fetch the list of all past passport scans.
 * Returns an array of scan summaries (id, passport_number, name, nationality, etc.)
 */
export async function getHistory() {
  const response = await api.get('/api/history')
  return response.data
}


// ── Get Single Record ─────────────────────────────────────────────────────────
/**
 * Fetch full details for one scan by ID.
 * @param {number} id - The scan record ID
 */
export async function getRecord(id) {
  const response = await api.get(`/api/history/${id}`)
  return response.data
}


// ── Delete Record ─────────────────────────────────────────────────────────────
/**
 * Delete a scan record from the database.
 * @param {number} id - The scan record ID to delete
 */
export async function deleteRecord(id) {
  const response = await api.delete(`/api/history/${id}`)
  return response.data
}