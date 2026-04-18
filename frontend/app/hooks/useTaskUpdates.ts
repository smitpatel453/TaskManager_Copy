import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../providers/SocketProvider";

export const useTaskUpdates = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !socket.connected) {
      console.warn("Socket not connected, cannot listen for task updates");
      return;
    }

    const handleTaskUpdate = (data: {
      _id: string;
      taskId: string;
      taskName: string;
      status: string;
      previousStatus?: string;
      updatedBy?: string;
      updatedByName?: string;
      updatedAt: Date;
    }) => {
      // Update all task-related queries in the cache
      queryClient.setQueryData(["tasks"], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          data: oldData.data?.map((task: any) =>
            task._id === data._id
              ? {
                  ...task,
                  status: data.status,
                  updatedAt: data.updatedAt,
                }
              : task
          ),
        };
      });

      // Update all filter variations (all, assigned, created)
      ["all", "assigned", "created"].forEach((filter) => {
        queryClient.setQueryData([`tasks-${filter}`], (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            data: oldData.data?.map((task: any) =>
              task._id === data._id
                ? {
                    ...task,
                    status: data.status,
                    updatedAt: data.updatedAt,
                  }
                : task
            ),
          };
        });
      });

      // Update single task details if cached
      queryClient.setQueryData(["task-details", data._id], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          status: data.status,
          updatedAt: data.updatedAt,
        };
      });

      console.log(`🔄 Task updated in real-time: ${data.taskName} → ${data.status}`);
    };

    socket.on("task:updated", handleTaskUpdate);

    return () => {
      socket.off("task:updated", handleTaskUpdate);
    };
  }, [socket, queryClient]);
};
