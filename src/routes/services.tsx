import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useServices, useServiceCategories, useDeleteService } from "@/data/services";
import { formatCurrency } from "@/lib/format";
import { ServiceFormDialog } from "@/components/services/service-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import type { ServiceWithCategory } from "@/data/types";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
});

function ServicesPage() {
  const { data: categories = [] } = useServiceCategories();
  const { data: services = [], isLoading } = useServices();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceWithCategory | null>(null);
  const deleteService = useDeleteService();

  const openCreate = () => {
    setSelectedService(null);
    setDialogOpen(true);
  };

  const openEdit = (service: ServiceWithCategory) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || service.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Services</h1>
            <p className="text-muted-foreground">Manage your business services</p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Add Service
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs by Category */}
        <Tabs
          value={selectedCategory || "all"}
          onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}
        >
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all">All Services ({services.length})</TabsTrigger>
            {categories.map((cat) => {
              const count = services.filter((s) => s.category_id === cat.id).length;
              return (
                <TabsTrigger key={cat.id} value={cat.id}>
                  {cat.name} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedCategory || "all"} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
                <CardDescription>{filteredServices.length} service(s)</CardDescription>
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
                    <p className="text-muted-foreground">No services found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>{formatCurrency(service.price)}</TableCell>
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
                              <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>
                                Edit
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
        </Tabs>
      </div>
      <ServiceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} service={selectedService} />
    </ProtectedRoute>
  );
}
