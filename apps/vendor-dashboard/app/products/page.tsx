"use client";

import type { ProductCategory, ProductSummary, VendorProductInput } from "@karigo/shared-types";
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
  isFeatured: false
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
    setLoading(true);
    setError("");
    try {
      setProducts(await productsApi.listMine({ productCategory: category || undefined, search }));
    } catch (e) {
      setError(friendlyError(e, "dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    total: products.length,
    available: products.filter((product) => product.isAvailable).length,
    unavailable: products.filter((product) => !product.isAvailable).length
  }), [products]);

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
      isFeatured: !!product.isFeatured
    });
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (editing) {
        await productsApi.update(editing.id, form);
        setMessage("Product updated successfully.");
      } else {
        await productsApi.create(form);
        setMessage("Product created successfully.");
      }
      resetForm();
      await load();
    } catch (e) {
      setError(friendlyError(e, "dashboard"));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(product: ProductSummary) {
    setError("");
    setMessage("");
    try {
      await productsApi.updateAvailability(product.id, { isAvailable: !product.isAvailable });
      setMessage(product.isAvailable ? "Product marked unavailable." : "Product marked available.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "dashboard"));
    }
  }

  async function archive(product: ProductSummary) {
    if (!window.confirm(`Archive ${product.name}? It will no longer appear to customers.`)) return;
    setError("");
    setMessage("");
    try {
      await productsApi.archive(product.id);
      setMessage("Product archived.");
      await load();
    } catch (e) {
      setError(friendlyError(e, "dashboard"));
    }
  }

  return <DashboardShell>
    <header className="topbar"><div><p className="muted">Vendor catalogue</p><h1>Products</h1></div><button className="secondary" onClick={() => void load()}>Retry / refresh</button></header>
    <section className="grid">
      <div className="card"><p className="muted">Total products</p><p className="metric">{summary.total}</p></div>
      <div className="card"><p className="muted">Available products</p><p className="metric">{summary.available}</p></div>
      <div className="card"><p className="muted">Unavailable products</p><p className="metric">{summary.unavailable}</p></div>
    </section>
    {message ? <p className="success">{message}</p> : null}
    {error ? <p className="error">{error}</p> : null}
    <section className="product-layout">
      <form className="card product-form" onSubmit={submit}>
        <h2>{editing ? "Edit product" : "Add product"}</h2>
        <input placeholder="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <textarea placeholder="Short description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        <input placeholder="Display category, e.g. Rice" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
        <select value={form.productCategory} onChange={(event) => setForm({ ...form, productCategory: event.target.value as ProductCategory })}>
          {categories.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <input placeholder="Price" type="number" min="1" step="1" value={form.price || ""} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} required />
        <input placeholder="HTTPS image URL" type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} required />
        {form.imageUrl ? <img className="product-preview" src={form.imageUrl} alt="" /> : null}
        <label className="check-row"><input type="checkbox" checked={!!form.isAvailable} onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })} /> Available</label>
        <label className="check-row"><input type="checkbox" checked={!!form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /> Featured</label>
        <button disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Create product"}</button>
        {editing ? <button className="secondary" type="button" onClick={resetForm}>Cancel edit</button> : null}
      </form>
      <section className="section">
        <div className="filters">
          <input placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select value={category} onChange={(event) => setCategory(event.target.value as ProductCategory | "")}>{categories.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}</select>
          <button className="secondary" onClick={() => void load()}>Apply</button>
        </div>
        {loading ? <div className="loading"><span className="spinner" />Loading products...</div> : products.length === 0 ? <div className="empty"><strong>No products yet.</strong><span>Create your first product to start selling on KariGO.</span></div> : products.map((product) => <article className="card product-row" key={product.id}>
          <img className="product-thumb" src={product.imageUrl} alt="" />
          <div>
            <h3>{product.name}</h3>
            <p className="muted">{product.description}</p>
            <p className="muted">{product.category} · {product.productCategory.replace("_", " ")}</p>
          </div>
          <div className="product-actions">
            <strong>{money(product.price)}</strong>
            <span className="badge" data-status={product.isAvailable ? "PAID" : "FAILED"}>{product.isAvailable ? "Available" : "Unavailable"}</span>
            <button className="secondary" onClick={() => edit(product)}>Edit</button>
            <button className="secondary" onClick={() => void toggle(product)}>{product.isAvailable ? "Mark unavailable" : "Mark available"}</button>
            <button className="secondary" onClick={() => void archive(product)}>Archive</button>
          </div>
        </article>)}
      </section>
    </section>
  </DashboardShell>;
}
