/**
 * Module-level cache for API data that rarely changes.
 * Survives navigation between pages, clears on full page refresh.
 */
import { api } from './api';

// ── Categories cache ──
let categoriesCache = null;
let categoriesPromise = null; // Prevents duplicate in-flight requests

/**
 * Get categories from cache or fetch once.
 * If multiple components call this simultaneously, they share the same request.
 */
export async function getCachedCategories() {
  if (categoriesCache) return categoriesCache;

  // If a request is already in-flight, wait for it
  if (categoriesPromise) return categoriesPromise;

  categoriesPromise = api.getCategories().then((res) => {
    categoriesCache = res;
    categoriesPromise = null;
    return res;
  }).catch((err) => {
    categoriesPromise = null;
    throw err;
  });

  return categoriesPromise;
}

/** Clear categories cache — call after creating/editing/deleting categories */
export function invalidateCategoriesCache() {
  categoriesCache = null;
  categoriesPromise = null;
}

// ── Dashboard month cache ──
const dashboardMonthCache = {};

export function getDashboardMonthCache(key) {
  return dashboardMonthCache[key] || null;
}

export function setDashboardMonthCache(key, data) {
  dashboardMonthCache[key] = data;
}

/** Clear dashboard cache — call after creating/editing/deleting transactions */
export function invalidateDashboardCache() {
  Object.keys(dashboardMonthCache).forEach((k) => delete dashboardMonthCache[k]);
}

// ── Budget cache ──
const budgetConfigCache = {};
let budgetConfigPromises = {};
let budgetPocketsCache = null;
let budgetPocketsPromise = null;

export async function getCachedBudgetConfig(year) {
  if (budgetConfigCache[year]) return budgetConfigCache[year];
  if (budgetConfigPromises[year]) return budgetConfigPromises[year];

  budgetConfigPromises[year] = api.getBudgetConfig(year).then((res) => {
    budgetConfigCache[year] = res;
    delete budgetConfigPromises[year];
    return res;
  }).catch((err) => {
    delete budgetConfigPromises[year];
    throw err;
  });

  return budgetConfigPromises[year];
}

export async function getCachedBudgetPockets() {
  if (budgetPocketsCache) return budgetPocketsCache;
  if (budgetPocketsPromise) return budgetPocketsPromise;

  budgetPocketsPromise = api.getBudgetPockets().then((res) => {
    budgetPocketsCache = res;
    budgetPocketsPromise = null;
    return res;
  }).catch((err) => {
    budgetPocketsPromise = null;
    throw err;
  });

  return budgetPocketsPromise;
}

export function invalidateBudgetCache() {
  Object.keys(budgetConfigCache).forEach((k) => delete budgetConfigCache[k]);
  budgetConfigPromises = {};
  budgetPocketsCache = null;
  budgetPocketsPromise = null;
}

// -- Cartera cache --
let carteraCache = null;
let carteraPromise = null;

export async function getCachedCartera() {
  if (carteraCache) return carteraCache;
  if (carteraPromise) return carteraPromise;

  carteraPromise = api.getCartera().then((res) => {
    carteraCache = res;
    carteraPromise = null;
    return res;
  }).catch((err) => {
    carteraPromise = null;
    throw err;
  });

  return carteraPromise;
}

export function invalidateCarteraCache() {
  carteraCache = null;
  carteraPromise = null;
}

/** Clear all caches */
export function invalidateAllCaches() {
  invalidateCategoriesCache();
  invalidateDashboardCache();
  invalidateCarteraCache();
  invalidateBudgetCache();
}
