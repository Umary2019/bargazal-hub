import { useState } from "react";
import { Bell, CheckCheck, Info, ExternalLink, Inbox } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "@/data/notifications";
import { formatDate } from "@/lib/format";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const unreadCount = unreadNotifications.length;

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.is_read) {
      await markRead.mutateAsync(notification.id);
    }
    if (notification.link) {
      setOpen(false);
      navigate({ to: notification.link as any });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-medium">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Updates regarding your requests, projects, and invoices will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-3.5 transition-colors cursor-pointer text-left hover:bg-muted/50 flex items-start gap-3 ${
                  !notification.is_read ? "bg-primary/5 dark:bg-primary/10" : ""
                }`}
              >
                <div
                  className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                    !notification.is_read ? "bg-primary" : "bg-transparent"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p
                        className={`text-xs truncate ${!notification.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}
                      >
                        {notification.title}
                      </p>
                      {notification.priority &&
                        (notification.priority === "High" ||
                          notification.priority === "Urgent") && (
                          <span className="rounded bg-red-100 px-1 py-0.2 text-[9px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300 shrink-0">
                            {notification.priority}
                          </span>
                        )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
