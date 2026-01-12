"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface PurchaseItem {
  name: string;
  price?: number;
  type?: string;
  color?: string;
  brand?: string;
  imageUrl?: string;
}

export default function ManualPurchaseForm({
  onSuccess,
  onClose,
}: {
  onSuccess?: () => void;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [store, setStore] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [total, setTotal] = useState<number | undefined>();
  const [items, setItems] = useState<PurchaseItem[]>([
    { name: "", price: undefined, type: "", color: "", brand: "", imageUrl: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [currentInputIndex, setCurrentInputIndex] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getFormInputs = useCallback(() => {
    if (!formRef.current) return [];
    return Array.from(
      formRef.current.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        'input:not([type="hidden"]), select'
      )
    );
  }, []);

  const navigateToInput = useCallback((direction: "prev" | "next") => {
    const inputs = getFormInputs();
    if (inputs.length === 0) return;

    let newIndex = currentInputIndex;
    if (direction === "prev") {
      newIndex = Math.max(0, currentInputIndex - 1);
    } else {
      newIndex = Math.min(inputs.length - 1, currentInputIndex + 1);
    }

    const targetInput = inputs[newIndex];
    if (targetInput) {
      targetInput.focus();
      setCurrentInputIndex(newIndex);
      // Scroll the input into view
      targetInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentInputIndex, getFormInputs]);

  const handleInputFocus = useCallback((e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "SELECT") {
      setIsInputFocused(true);
      const inputs = getFormInputs();
      const index = inputs.indexOf(target as HTMLInputElement | HTMLSelectElement);
      if (index !== -1) {
        setCurrentInputIndex(index);
      }
    }
  }, [getFormInputs]);

  const handleInputBlur = useCallback((e: FocusEvent) => {
    // Delay to check if focus moved to another input or the nav buttons
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isStillInForm = formRef.current?.contains(activeElement);
      const isNavButton = activeElement?.closest("[data-keyboard-nav]");
      if (!isStillInForm && !isNavButton) {
        setIsInputFocused(false);
      }
    }, 100);
  }, []);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    form.addEventListener("focusin", handleInputFocus);
    form.addEventListener("focusout", handleInputBlur);

    return () => {
      form.removeEventListener("focusin", handleInputFocus);
      form.removeEventListener("focusout", handleInputBlur);
    };
  }, [handleInputFocus, handleInputBlur]);

  // Track keyboard height using VisualViewport API
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // Calculate keyboard height as difference between window and viewport
      const keyboardH = window.innerHeight - viewport.height;
      setKeyboardHeight(Math.max(0, keyboardH));
    };

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);
    handleResize(); // Initial call

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  const addItem = () => {
    setItems([
      ...items,
      { name: "", price: undefined, type: "", color: "", brand: "", imageUrl: "" },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number | undefined) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id) {
      toast.error("Please log in to add purchases");
      return;
    }

    if (!store || items.some((item) => !item.name)) {
      toast.error("Please fill in store name and all item names");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        userId: session.user.id,
        store,
        orderNumber: orderNumber || undefined,
        purchaseDate: purchaseDate || undefined,
        total: total || undefined,
        items: items.map((item) => ({
          name: item.name,
          price: item.price || undefined,
          type: item.type || undefined,
          color: item.color || undefined,
          brand: item.brand || undefined,
          imageUrl: item.imageUrl || undefined,
        })),
      };

      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add purchase");
      }

      const data = await response.json();
      toast.success(
        `Added ${data.purchases?.length || items.length} purchase(s)${data.addedToWardrobe ? `, ${data.addedToWardrobe} added to wardrobe` : ""}`
      );

      // Reset form
      setStore("");
      setOrderNumber("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setTotal(undefined);
      setItems([
        { name: "", price: undefined, type: "", color: "", brand: "", imageUrl: "" },
      ]);

      onSuccess?.();
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error("Failed to add purchase:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clothingTypes = [
    "shirt",
    "t-shirt",
    "pants",
    "jeans",
    "jacket",
    "coat",
    "sweater",
    "hoodie",
    "dress",
    "shorts",
    "skirt",
    "shoes",
    "boots",
    "sneakers",
    "hat",
    "accessories",
    "overalls",
    "jumpsuit",
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 pt-8 sm:pt-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col my-auto sm:my-0">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add Purchase Manually</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form ref={formRef} onSubmit={handleSubmit} className="p-6 pb-32 sm:pb-6 space-y-6" id="purchase-form">
          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Store <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="e.g., Nordstrom, Levi's"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Order Number
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Total Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={total || ""}
                onChange={(e) =>
                  setTotal(e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-700">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        placeholder="e.g., Lands' End Corduroy Chore Jacket"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price || ""}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "price",
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <select
                        value={item.type || ""}
                        onChange={(e) => updateItem(index, "type", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="">Select type...</option>
                        {clothingTypes.map((type) => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Color</label>
                      <input
                        type="text"
                        value={item.color || ""}
                        onChange={(e) => updateItem(index, "color", e.target.value)}
                        placeholder="e.g., Navy, Black"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Brand</label>
                      <input
                        type="text"
                        value={item.brand || ""}
                        onChange={(e) => updateItem(index, "brand", e.target.value)}
                        placeholder="e.g., Lands' End"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Image URL
                      </label>
                      <input
                        type="url"
                        value={item.imageUrl || ""}
                        onChange={(e) => updateItem(index, "imageUrl", e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
        </div>

        {/* Keyboard Navigation Toolbar - Mobile Only, Fixed above keyboard */}
        {isInputFocused && (
          <div
            data-keyboard-nav
            className="fixed left-0 right-0 sm:hidden border-t border-gray-200 bg-gray-100 px-4 py-2 flex items-center justify-between z-[60]"
            style={{ bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px' }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToInput("prev")}
                disabled={currentInputIndex === 0}
                className="p-2 rounded-md bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed active:bg-gray-200"
                aria-label="Previous field"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => navigateToInput("next")}
                disabled={currentInputIndex >= getFormInputs().length - 1}
                className="p-2 rounded-md bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed active:bg-gray-200"
                aria-label="Next field"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <span className="text-sm text-gray-500">
              {currentInputIndex + 1} / {getFormInputs().length}
            </span>
            <button
              type="button"
              onClick={() => {
                const inputs = getFormInputs();
                if (inputs[currentInputIndex]) {
                  inputs[currentInputIndex].blur();
                }
                setIsInputFocused(false);
              }}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 active:text-blue-800"
            >
              Done
            </button>
          </div>
        )}

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="purchase-form"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add Purchase"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

