"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTodos } from "@/hooks/use-todos";
import { TodoList } from "@/components/todos/todo-list";
import { TodoForm } from "@/components/todos/todo-form";
import { Button } from "@/components/ui/button";

export default function TodosPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { data: session } = useSession();
  const { todos, isLoading, mutate } = useTodos(groupId);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Todo List</h2>
        <Button onClick={() => setShowForm(true)} size="sm">
          Add Todo
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading todos...</div>
      ) : (
        <TodoList
          todos={todos}
          groupId={groupId}
          currentUserId={session?.user?.id || ""}
          onUpdate={() => mutate()}
        />
      )}

      <TodoForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        groupId={groupId}
        onSuccess={() => {
          mutate();
          setShowForm(false);
        }}
      />
    </div>
  );
}
