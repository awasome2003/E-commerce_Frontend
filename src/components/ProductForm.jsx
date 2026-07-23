import { useEffect, useState } from 'react'
import { api } from '../lib/api'

/**
 * The product field set, shared by create and edit.
 *
 * Both pages write the same 14 columns through the same `WRITABLE` allow-list on
 * the server, so they share the markup and the form/body conversion. Keeping one
 * copy is what stops the two drifting — a field added to edit but not to create
 * would silently be unsettable on new products.
 */

/** Client-side enum identifiers; Prisma maps these back to "S1-DRY" etc. */
export const WAREHOUSES = ['S1_DRY', 'S1_FRZN', 'S1_CHLD']

const NUMERIC = new Set([
  'inst_price',
  'tax',
  'category_id',
  'sub_category_id',
  'brand_id',
  'manufacturer_id',
  'quantity_per_package',
  'weight_per_purchasing_unit',
  'weight_per_sales_unit',
  'is_active',
])

// `moq` is deliberately absent: the column is varchar(255), not an int, and
// Prisma rejects a number for it. The input is type=number for the stepper, but
// the value stays a string all the way to the server.

/** A blank product. New rows default to active. */
export const EMPTY_PRODUCT = {
  product_name: '',
  product_description: '',
  inst_price: '',
  tax: '',
  hsn_code: '',
  item_number: '',
  moq: '',
  warehouse: '',
  category_id: '',
  sub_category_id: '',
  brand_id: '',
  manufacturer_id: '',
  quantity_per_package: '',
  is_active: 1,
}

/**
 * Form state -> request body.
 *
 * Empty selects and inputs must go back as null, not "", or MySQL rejects them
 * against the int columns and the warehouse enum.
 */
export function toBody(form) {
  const body = {}
  for (const [key, value] of Object.entries(form)) {
    if (value === '') body[key] = null
    else if (NUMERIC.has(key)) body[key] = Number(value)
    else body[key] = value
  }
  return body
}

/** Categories, brands and manufacturers, with sub-categories following the category. */
export function useProductLookups(categoryId) {
  const [lookups, setLookups] = useState({
    categories: [],
    subCategories: [],
    brands: [],
    manufacturers: [],
  })

  useEffect(() => {
    Promise.all([api.categories(), api.brands(), api.manufacturers()])
      .then(([categories, brands, manufacturers]) =>
        setLookups((prev) => ({ ...prev, categories, brands, manufacturers })),
      )
      .catch(() => {})
  }, [])

  // Sub-categories belong to a category, so the list reloads whenever it changes.
  useEffect(() => {
    if (!categoryId) {
      setLookups((prev) => ({ ...prev, subCategories: [] }))
      return
    }
    api
      .subCategories(categoryId)
      .then((subCategories) => setLookups((prev) => ({ ...prev, subCategories })))
      .catch(() => {})
  }, [categoryId])

  return lookups
}

export default function ProductFields({ form, set, lookups, editable }) {
  return (
    <>
      <label className="field">
        <span>Name</span>
        <input
          className="input"
          value={form.product_name}
          onChange={(e) => set('product_name', e.target.value)}
          disabled={!editable}
        />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          className="input"
          rows={4}
          value={form.product_description}
          onChange={(e) => set('product_description', e.target.value)}
          disabled={!editable}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Selling price (₹)</span>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.inst_price}
            onChange={(e) => set('inst_price', e.target.value)}
            disabled={!editable}
          />
        </label>
        <label className="field">
          <span>Tax (%)</span>
          <input
            className="input"
            type="number"
            value={form.tax}
            onChange={(e) => set('tax', e.target.value)}
            disabled={!editable}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>HSN code</span>
          <input
            className="input"
            value={form.hsn_code}
            onChange={(e) => set('hsn_code', e.target.value)}
            disabled={!editable}
          />
        </label>
        <label className="field">
          <span>Item number</span>
          <input
            className="input"
            value={form.item_number}
            onChange={(e) => set('item_number', e.target.value)}
            disabled={!editable}
          />
        </label>
      </div>

      {/* Both columns are writable on the server and both drive storefront
          behaviour — pack size is shown on the catalogue and MOQ gates the cart —
          but neither had an input before. */}
      <div className="field-row">
        <label className="field">
          <span>Minimum order qty</span>
          <input
            className="input"
            type="number"
            min="0"
            value={form.moq}
            onChange={(e) => set('moq', e.target.value)}
            disabled={!editable}
          />
        </label>
        <label className="field">
          <span>Quantity per package</span>
          <input
            className="input"
            type="number"
            min="0"
            value={form.quantity_per_package}
            onChange={(e) => set('quantity_per_package', e.target.value)}
            disabled={!editable}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Category</span>
          <select
            className="input"
            value={form.category_id}
            onChange={(e) => {
              set('category_id', e.target.value)
              set('sub_category_id', '')
            }}
            disabled={!editable}
          >
            <option value="">—</option>
            {lookups.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sub-category</span>
          <select
            className="input"
            value={form.sub_category_id}
            onChange={(e) => set('sub_category_id', e.target.value)}
            disabled={!editable || !form.category_id}
          >
            <option value="">—</option>
            {lookups.subCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Brand</span>
          <select
            className="input"
            value={form.brand_id}
            onChange={(e) => set('brand_id', e.target.value)}
            disabled={!editable}
          >
            <option value="">—</option>
            {lookups.brands.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Manufacturer</span>
          <select
            className="input"
            value={form.manufacturer_id}
            onChange={(e) => set('manufacturer_id', e.target.value)}
            disabled={!editable}
          >
            <option value="">—</option>
            {lookups.manufacturers.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Warehouse</span>
          <select
            className="input"
            value={form.warehouse}
            onChange={(e) => set('warehouse', e.target.value)}
            disabled={!editable}
          >
            <option value="">—</option>
            {WAREHOUSES.map((w) => (
              <option key={w} value={w}>{w.replace(/_/g, '-')}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select
            className="input"
            value={form.is_active}
            onChange={(e) => set('is_active', e.target.value)}
            disabled={!editable}
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </label>
      </div>
    </>
  )
}
