"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useCustomerMutations } from "@/hooks";

export default function CustomerForm({ customer, onClose, onSuccess }) {
  const { createCustomer, updateCustomer } = useCustomerMutations();
  const isEditing = !!customer;
  const dialogRef = useRef(null);
  const firstInputRef = useRef(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    mode: "onChange",
    defaultValues: {
      name: customer?.name || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      address: customer?.address || "",
      notes: customer?.notes || "",
    },
  });

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Auto-focus first input
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll('input, textarea, select, button, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    dialog.addEventListener("keydown", handleTab);
    return () => dialog.removeEventListener("keydown", handleTab);
  }, []);

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await updateCustomer.mutateAsync({ id: customer.id, data });
      } else {
        await createCustomer.mutateAsync(data);
      }
      onSuccess();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-form-title"
    >
      <div ref={dialogRef} className="w-full max-w-md bg-surface-raised rounded-2xl shadow-xl p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h2 id="customer-form-title" className="text-xl font-bold text-text-primary mb-6">
          {isEditing ? "Edit Customer" : "Add Customer"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Name *</label>
            <input
              ref={firstInputRef}
              {...register("name", { required: "Name is required" })}
              className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Customer name"
            />
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
            <input
              {...register("phone")}
              className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input
              {...register("email")}
              type="email"
              className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Address</label>
            <input
              {...register("address")}
              className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
            <textarea
              {...register("notes")}
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-border-theme rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Additional notes"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border-theme text-text-secondary rounded-lg font-medium hover:bg-hover-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
