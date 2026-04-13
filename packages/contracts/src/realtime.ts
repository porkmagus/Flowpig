export interface RealtimeEvent {
  type: string;
  timestamp: number;
  payload: unknown;
}

export interface IssueUpdatedEvent extends RealtimeEvent {
  type: 'issue.updated';
  payload: {
    workspaceId: string;
    issueId: string;
    changes: Record<string, unknown>;
  };
}

export interface CommentCreatedEvent extends RealtimeEvent {
  type: 'comment.created';
  payload: {
    workspaceId: string;
    commentId: string;
    issueId?: string;
    noteId?: string;
  };
}

export interface NoteUpdatedEvent extends RealtimeEvent {
  type: 'note.updated';
  payload: {
    workspaceId: string;
    noteId: string;
    changes: Record<string, unknown>;
  };
}

export interface NotificationCreatedEvent extends RealtimeEvent {
  type: 'notification.created';
  payload: {
    userId: string;
    notificationId: string;
  };
}

export type RealtimeEventType = 
  | IssueUpdatedEvent 
  | CommentCreatedEvent 
  | NoteUpdatedEvent 
  | NotificationCreatedEvent;
