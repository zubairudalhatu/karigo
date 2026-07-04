"use client";

import type { ProductCategory, ProductOptionGroupInput, ProductOptionInput, ProductSummary, VendorProductInput } from "@karigo/shared-types";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { productsApi } from "../../src/api/products.api";
import { DashboardShell } from "../../src/components/dashboard";
import { friendlyError } from "../../src/lib/errors";

const categories: { value: ProductCategory | ""; label: string }[] = [
  { value: "", label: "All categories" },
  { value: "FOOD", label: "Food" },
  { value: "GROCERIES", label: "Groceries" },
  { value: "MARKET_ITEMS", label: "Market items" }
];

const emptyForm: VendorProductInput = {
  name: "",
  description: "",
  category: "",
  productCategory: "FOOD",
  price: 0,
  imageUrl: "",
  isAvailable: true,
  isFeatured: false,
  optionGroups: []
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", { currency: "NGN", style: "currency", maximumFractionDigits: 0 }).format(value);
}

export default function Products() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [form, setForm] = useState<VendorProductInput>(emptyForm);
  const [editing, setEditing] = useState<ProductSummary | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setProducts(await productsApi.listMine({ productCategory: category || undefined, search })); }
    catch (e) { setError(friendlyError(e, "dashboard")); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    total: products.length,
    available: products.filter((product) => product.isAvailable).length,
    unavailable: products.filter((product) => !product.isAvailable).length
  }), [products]);

  function resetForm() { setEditing(null); setForm(emptyForm); }

  function edit(product: ProductSummary) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      productCategory: product.productCategory,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      isAvailable: product.isAvailable,
      isFeatured: !!product.isFeatured,
      optionGroups: product.optionGroups?.map((group) => ({
        name: group.name,
        required: group.required,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        displayOrder: group.displayOrder,
        options: group.options.map((option) => ({
          name: option.name,
          priceAdjustmentKobo: option.priceAdjustmentKobo,
          available: option.available,
          displayOrder: option.displayOrder
        }))
      })) ?? []
    });
    setMessage(""); setError("");
  }

  function updateGroup(groupIndex: number, patch: Partial<ProductOptionGroupInput>) {
    setForm((current) => ({ ...current, optionGroups: (current.optionGroups ?? []).map((group, index) => index === groupIndex ? { ...group, ...patch } : group) }));
  }

  function updateOption(groupIndex: number, optionIndex: number, patch: Partial<ProductOptionInput>) {
    setForm((current) => ({ ...current, optionGroups: (current.optionGroups ?? []).map((group, index) => index === groupIndex ? { ...group, options: (group.options ?? []).map((option, childIndex) => childIndex === optionIndex ? { ...option, ...patch } : option) } : group) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      if (editing) { await productsApi.update(editing.id, form); setMessage("Product updated successfully."); }
      else { await productsApi.create(form); setMessage("Product created successfully."); }
      resetForm(); await load();
    } catch (e) { setError(friendlyError(e, "dashboard")); }
    finally { setSaving(false); }
  }

  async function toggle(product: ProductSummary) {
    setError(""); setMessage("");
    try { await productsApi.updateAvailability(product.id, { isAvailable: !product.isAvailable }); setMessage(product.isAvailable ? "Product marked unavailable." : "Product marked available."); await load(); }
    catch (e) { setError(friendlyError(e, "dashboard")); }
  }

  async function archive(product: ProductSummary) {
    if (!window.confirm(`Archive ${product.name}? It will no longer appear to customers.`)) return;
    setError(""); setMessage("");
    try { await productsApi.archive(product.id); setMessage("Product archived."); await load(); }
    catch (e) { setError(friendlyError(e, "dashboard")); }
  }

  return <DashboardShell>
    <header className="topbar"><div><p className="muted">Vendor catalogue</p><h1>Products</h1><p className="muted">Manage your menu, availability and product options.</p></div><button onClick={resetForm}>Add product</button></header>
    <section className="grid"><div className="card"><p className="muted">Total products</p><p className="metric">{summary.total}</p></div><div className="card"><p className="muted">Available products</p><p className="metric">{summary.available}</p></div><div className="card"><p className="muted">Unavailable products</p><p className="metric">{summary.unavailable}</p></div></section>
    {message ? <p className="success">{message}</p> : null}{error ? <p className="error">{error}</p> : null}
    <section className="product-layout">
      <form className="card product-form" onSubmit={submit}>
        <h2>{editing ? "Edit product" : "Add product"}</h2>
        <input placeholder="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <textarea placeholder="Short description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        <input placeholder="Display category, e.g. Rice" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
        <select value={form.productCategory} onChange={(event) => setForm({ ...form, productCategory: event.target.value as ProductCategory })}>{categories.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <input placeholder="Price" type="number" min="1" step="1" value={form.price || ""} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} required />
        <input placeholder="HTTPS image URL" type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} required />
        {form.imageUrl ? <img className="product-preview" src={form.imageUrl} alt="" /> : null}
        <label className="check-row"><input type="checkbox" checked={!!form.isAvailable} onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })} /> Available</label>
        <label className="check-row"><input type="checkbox" checked={!!form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /> Featured</label>
        <div className="options-panel"><div className="order-row"><div><h3>Options & add-ons</h3><p className="muted">Create sizes, spice levels, extras or variants.</p></div><button className="secondary" type="button" onClick={() => setForm((current) => ({ ...current, optionGroups: [...(current.optionGroups ?? []), { name: "Options", required: false, minSelections: 0, maxSelections: 1, displayOrder: current.optionGroups?.length ?? 0, options: [] }] }))}>Add option group</button></div>
          {(form.optionGroups ?? []).map((group, groupIndex) => <div className="option-group" key={groupIndex}><input placeholder="Group name" value={group.name} onChange={(event) => updateGroup(groupIndex, { name: event.target.value })} /><label className="check-row"><input type="checkbox" checked={!!group.required} onChange={(event) => updateGroup(groupIndex, { required: event.target.checked, minSelections: event.target.checked ? Math.max(1, group.minSelections ?? 0) : 0 })} /> Required</label><div className="option-grid"><input type="number" min="0" placeholder="Min" value={group.minSelections ?? 0} onChange={(event) => updateGroup(groupIndex, { minSelections: Number(event.target.value) })} /><input type="number" min="1" placeholder="Max" value={group.maxSelections ?? 1} onChange={(event) => updateGroup(groupIndex, { maxSelections: Number(event.target.value) })} /></div>{(group.options ?? []).map((option, optionIndex) => <div className="option-grid" key={optionIndex}><input placeholder="Option name" value={option.name} onChange={(event) => updateOption(groupIndex, optionIndex, { name: event.target.value })} /><input type="number" min="0" step="50" placeholder="Price adjustment in kobo" value={option.priceAdjustmentKobo} onChange={(event) => updateOption(groupIndex, optionIndex, { priceAdjustmentKobo: Number(event.target.value) })} /><label className="check-row"><input type="checkbox" checked={option.available ?? true} onChange={(event) => updateOption(groupIndex, optionIndex, { available: event.target.checked })} /> Available</label><button className="secondary" type="button" onClick={() => updateGroup(groupIndex, { options: (group.options ?? []).filter((_, index) => index !== optionIndex) })}>Remove option</button></div>)}<div className="actions"><button className="secondary" type="button" onClick={() => updateGroup(groupIndex, { options: [...(group.options ?? []), { name: "New option", priceAdjustmentKobo: 0, available: true, displayOrder: group.options?.length ?? 0 }] })}>Add option</button><button className="secondary" type="button" onClick={() => setForm((current) => ({ ...current, optionGroups: (current.optionGroups ?? []).filter((_, index) => index !== groupIndex) }))}>Remove group</button></div></div>)}
        </div>
        <button disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Create product"}</button>{editing ? <button className="secondary" type="button" onClick={resetForm}>Cancel edit</button> : null}
      </form>
      <section className="section"><div className="filters"><input placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={category} onChange={(event) => setCategory(event.target.value as ProductCategory | "")}>{categories.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}</select><button className="secondary" onClick={() => void load()}>Apply</button></div>
        {loading ? <div className="loading"><span className="spinner" />Loading products...</div> : products.length === 0 ? <div className="empty"><strong>No products yet.</strong><span>Create your first product to start selling on KariGO.</span></div> : products.map((product) => <article className="card product-row" key={product.id}><img className="product-thumb" src={product.imageUrl} alt="" /><div><h3>{product.name}</h3><p className="muted">{product.description}</p><p className="muted">{product.category} · {product.productCategory.replace("_", " ")}</p>{product.optionGroups?.length ? <p className="muted">{product.optionGroups.length} option group{product.optionGroups.length === 1 ? "" : "s"}</p> : null}</div><div className="product-actions"><strong>{money(product.price)}</strong><span className="badge" data-status={product.isAvailable ? "PAID" : "FAILED"}>{product.isAvailable ? "Available" : "Unavailable"}</span><button className="secondary" onClick={() => edit(product)}>Edit</button><button className="secondary" onClick={() => void toggle(product)}>{product.isAvailable ? "Mark unavailable" : "Mark available"}</button><button className="secondary" onClick={() => void archive(product)}>Archive</button></div></article>)}
      </section>
    </section>
  </DashboardShell>;
}
