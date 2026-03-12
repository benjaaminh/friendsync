/**
 * Feature component responsible for todo list rendering and interactions.
 */
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodoItem } from "./todo-item";
import type { TodoWithCreator } from "@/types";

interface TodoListProps {
  todos: TodoWithCreator[];
  groupId: string;
  currentUserId: string;
  onUpdate: () => void;
}

export function TodoList({ todos, groupId, currentUserId, onUpdate }: TodoListProps) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? todos
    : todos.filter((t) => t.status === filter.toUpperCase());

  const counts = {
    all: todos.length,
    pending: todos.filter((t) => t.status === "PENDING").length,
    scheduled: todos.filter((t) => t.status === "SCHEDULED").length,
    completed: todos.filter((t) => t.status === "COMPLETED").length,
  };

  if (todos.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No todos yet.</p>
        <p className="text-sm">Add activities you want to do together.</p>
      </div>
    );
  }

  return (
    /* filter todos by their type */
    <Tabs defaultValue="all" onValueChange={setFilter}>
      <TabsList>
        <TabsTrigger value="all">
          All <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
        </TabsTrigger>
        <TabsTrigger value="pending">
          Pending <Badge variant="secondary" className="ml-1">{counts.pending}</Badge>
        </TabsTrigger>
        <TabsTrigger value="scheduled">
          Scheduled <Badge variant="secondary" className="ml-1">{counts.scheduled}</Badge>
        </TabsTrigger>
        <TabsTrigger value="completed">
          Done <Badge variant="secondary" className="ml-1">{counts.completed}</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={filter} className="mt-4">
        <div className="space-y-3">
          {filtered.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              groupId={groupId}
              currentUserId={currentUserId}
              onUpdate={onUpdate}
            />
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No {filter !== "all" ? filter : ""} todos
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
