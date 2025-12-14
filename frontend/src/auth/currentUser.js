// src/auth/currentUser.js

// For now this is hard-coded.
// Later this will come from real login / JWT / backend.
export const currentUser = {
  id: 1,
  name: "Admin",
  role: "ADMIN", // change to "EMPLOYEE" to test restricted view
};