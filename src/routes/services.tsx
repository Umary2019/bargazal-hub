import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Trash2, Pencil, FolderTree, Layers, Check, X } from "lucide-react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useServices,
  useServiceCategories,
  useDeleteService,
  useSaveServiceCategory,
  useDeleteServiceCategory,
} from "@/data/services";
import { formatCurrency } from "@/lib/format";
import { ServiceFormDialog } from "@/components/services/service-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import type { ServiceWithCategory, ServiceCategory } from "@/data/types";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
});

function ServicesPage() {
  const { data: categories = [] } = useServiceCategories();
  const { data: services = [], isLoading } = useServices();
  const deleteService = useDeleteService();
  const saveCategory = useSaveServiceCategory();
  const deleteCategory = useDeleteServiceCategory();

  const [activeMainTab, setActiveMainTab] = useState<"services" | "categories">("services");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Service dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceWithCategory | null>(null);

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catSortOrder, setCatSortOrder] = useState(0);
  const [catIsActive, setCatIsActive] = useState(true);

  // Service Handlers
  const openCreateService = () => {
    setSelectedService(null);
    setDialogOpen(true);
  };

  const openEditService = (service: ServiceWithCategory) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  // Category Handlers
  const openCreateCategory = () => {
    setSelectedCat(null);
    setCatName("");
    setCatDescription("");
    setCatSortOrder(categories.length + 1);
    setCatIsActive(true);
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: ServiceCategory) => {
    setSelectedCat(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || "");
    setCatSortOrder(cat.sort_order || 0);
    setCatIsActive((cat as any).is_active ?? true);
    setCategoryDialogOpen(true);
  };

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      await saveCategory.mutateAsync({
        ...(selectedCat?.id ? { id: selectedCat.id } : {}),
        values: {
          name: catName.trim(),
          description: catDescription.trim() || null,
          sort_order: Number(catSortOrder) || 0,
          is_active: catIsActive,
        } as any,
      });
      setCategoryDialogOpen(false);
    } catch {
      // Error handled by mutation
    }
  }

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || service.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <ProtectedRoute roles={["admin", "staff"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Services & Catalog</h1>
            <p className="text-muted-foreground">
              Configure your service offerings, pricing structures, and categories.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeMainTab === "services" ? (
              <Button className="gap-2" onClick={openCreateService}>
                <Plus className="w-4 h-4" />
                Add Service
              </Button>
            ) : (
              <Button className="gap-2" onClick={openCreateCategory}>
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            )}
          </div>
        </div>

        {/* Top-level Tabs */}
        <Tabs
          value={activeMainTab}
          onValueChange={(v) => setActiveMainTab(v as "services" | "categories")}
        >
          <TabsList>
            <TabsTrigger value="services" className="gap-2">
              <Layers className="w-4 h-4" />
              Services Catalog ({services.length})
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderTree className="w-4 h-4" />
              Categories ({categories.length})
            </TabsTrigger>
          </TabsList>

          {/* Services Catalog Tab */}
          <TabsContent value="services" className="space-y-6 pt-2">
            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  selectedCategory === null
                    ? "bg-background shadow-xs text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Services ({services.length})
              </button>
              {categories.map((cat) => {
                const count = services.filter((s) => s.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                      selectedCategory === cat.id
                        ? "bg-background shadow-xs text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Services Table */}
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
                <CardDescription>{filteredServices.length} service(s) available</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No services found in this category.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            <div>
                              <span>{service.name}</span>
                              {service.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {service.service_categories?.name || "Uncategorized"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(service.price)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{service.pricing_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={service.status === "Active" ? "default" : "secondary"}>
                              {service.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditService(service)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <ConfirmDialog
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                                title="Delete service?"
                                description="This permanently removes the service from your catalog."
                                confirmLabel="Delete"
                                onConfirm={() => deleteService.mutate(service.id)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Management Tab */}
          <TabsContent value="categories" className="space-y-6 pt-2">
            <Card>
              <CardHeader>
                <CardTitle>Service Categories</CardTitle>
                <CardDescription>
                  Organize services into parent groups for client navigation and request forms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No categories defined yet.</p>
                    <Button onClick={openCreateCategory} variant="outline" className="mt-4">
                      Create First Category
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Sort Order</TableHead>
                        <TableHead>Services Count</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat: any) => {
                        const count = services.filter((s) => s.category_id === cat.id).length;
                        const isActive = cat.is_active !== false;
                        return (
                          <TableRow key={cat.id}>
                            <TableCell className="font-semibold text-foreground">
                              {cat.name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {cat.description || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {cat.sort_order ?? 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{count} services</Badge>
                            </TableCell>
                            <TableCell>
                              {isActive ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCategory(cat)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <ConfirmDialog
                                  trigger={
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:bg-red-50"
                                      disabled={count > 0}
                                      title={
                                        count > 0
                                          ? "Cannot delete category containing services"
                                          : "Delete category"
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  }
                                  title="Delete category?"
                                  description={`Permanently remove "${cat.name}"? Only categories without services can be deleted.`}
                                  confirmLabel="Delete"
                                  onConfirm={() => deleteCategory.mutate(cat.id)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Service Create/Edit Dialog */}
      <ServiceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} service={selectedService} />

      {/* Category Create/Edit Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCat ? "Edit Category" : "Add Service Category"}</DialogTitle>
            <DialogDescription>
              Provide name, display priority, and description for this service category.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Category Name *
              </label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. SIWES & Academic Projects"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Description
              </label>
              <Textarea
                rows={2}
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Brief summary of what this category offers"
              />
            </div>
            <div className="grid gap-3 grid-cols-2 items-center">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Sort Order
                </label>
                <Input
                  type="number"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(Number(e.target.value))}
                />
              </div>
              <div className="pt-5 flex items-center gap-2">
                <Switch checked={catIsActive} onCheckedChange={setCatIsActive} />
                <span className="text-xs font-medium">Active</span>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveCategory.isPending}>
                {saveCategory.isPending ? "Saving..." : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
