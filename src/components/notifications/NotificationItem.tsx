import { Notification } from '@/types/academic';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
    notification: Notification;
    onMarkAsRead: (id: string) => void;
    onClick?: () => void;
}

export function NotificationItem({ notification, onMarkAsRead, onClick }: NotificationItemProps) {
    const handleClick = () => {
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }
        onClick?.();
    };

    const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
        locale: ptBR,
    });

    return (
    <div
            className={cn(
                'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-accent',
                !notification.read && 'bg-primary/5',
                notification.read && 'opacity-50 hover:opacity-75'
            )}
            onClick={handleClick}
        >
            <div className={cn(
                'mt-1 rounded-full p-2',
                notification.read ? 'bg-muted' : 'bg-primary/10'
            )}>
                <Bell className={cn(
                    'h-4 w-4',
                    notification.read ? 'text-muted-foreground' : 'text-primary'
                )} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        'text-sm',
                        notification.read ? 'font-normal text-muted-foreground' : 'font-semibold'
                    )}>
                        {notification.title}
                    </p>
                    {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                </div>

                <p className={cn(
                    'text-sm mt-1 line-clamp-2',
                    notification.read ? 'text-muted-foreground/70' : 'text-muted-foreground'
                )}>
                    {notification.message}
                </p>

                <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                        {timeAgo}
                    </p>

                    {notification.read && (
                        <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                    )}
                </div>
            </div>
        </div>
    );
}
