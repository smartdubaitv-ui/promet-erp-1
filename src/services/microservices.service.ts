import { logger } from '../config/logger';
import { SecurityService } from './security.service';

interface Message {
  id: string;
  topic: string;
  payload: any;
  timestamp: string;
  attempts: number;
  status: 'pending' | 'processed' | 'failed';
}

type ConsumerCallback = (payload: any) => Promise<void>;

class MicroservicesBroker {
  private queues = new Map<string, ConsumerCallback[]>();
  private messageStore: Message[] = [];
  private shardedNodesCount = 3;

  constructor() {
    // Start periodic worker thread to process failed or retry messages (Simulating Kafka offset delivery)
    setInterval(() => this.processDeadLetterQueue(), 15000);
  }

  /**
   * 1. Message Broker (Kafka/RabbitMQ Style Pub-Sub Engine)
   */
  public subscribe(topic: string, callback: ConsumerCallback): void {
    if (!this.queues.has(topic)) {
      this.queues.set(topic, []);
    }
    this.queues.get(topic)!.push(callback);
    logger.info(`📡 [BROKER SUBSCRIBER] Microservice registered for topic: ${topic}`);
  }

  public async publish(topic: string, payload: any): Promise<string> {
    const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const msg: Message = {
      id: messageId,
      topic,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0,
      status: 'pending'
    };

    this.messageStore.push(msg);
    logger.info(`📤 [BROKER PUBLISH] Topic: "${topic}" | Msg ID: ${messageId}`);

    // Asynchronously trigger consumer workers
    const consumers = this.queues.get(topic) || [];
    for (const consumer of consumers) {
      this.dispatchToConsumer(consumer, msg);
    }

    return messageId;
  }

  private async dispatchToConsumer(consumer: ConsumerCallback, msg: Message) {
    try {
      msg.attempts++;
      await consumer(msg.payload);
      msg.status = 'processed';
    } catch (err: any) {
      logger.error(`❌ [BROKER FAILURE] Error delivery on Msg: ${msg.id} to consumer. Error: ${err.message}`);
      if (msg.attempts >= 3) {
        msg.status = 'failed';
      }
    }
  }

  private processDeadLetterQueue() {
    const pendings = this.messageStore.filter(m => m.status === 'pending' && m.attempts < 3);
    if (pendings.length === 0) return;

    logger.info(`♻️ [BROKER RETRY] Retrying ${pendings.length} pending/failed messages in Dead Letter Queue...`);
    for (const msg of pendings) {
      const consumers = this.queues.get(msg.topic) || [];
      for (const consumer of consumers) {
        this.dispatchToConsumer(consumer, msg);
      }
    }
  }

  /**
   * 2. Database Sharding & Partitioning Simulator (PostgreSQL / Firestore Optimization)
   * Resolves target DB Node for a given tenant or entity
   */
  public getShardNode(tenantId: string): { nodeId: string; region: string; replicaHost: string; masterHost: string } {
    // Simple hash function for tenant ID
    let hash = 0;
    const str = tenantId || 'tenant-default';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const nodeIndex = Math.abs(hash % this.shardedNodesCount) + 1;

    const nodes: Record<number, { nodeId: string; region: string; replicaHost: string; masterHost: string }> = {
      1: {
        nodeId: 'db-shard-eu-west1',
        region: 'europe-west1 (Primary)',
        masterHost: 'pg-master-eu-1.gcp.internal',
        replicaHost: 'pg-replica-eu-1.gcp.internal'
      },
      2: {
        nodeId: 'db-shard-us-east4',
        region: 'us-east4 (Secondary)',
        masterHost: 'pg-master-us-2.gcp.internal',
        replicaHost: 'pg-replica-us-2.gcp.internal'
      },
      3: {
        nodeId: 'db-shard-me-central1',
        region: 'me-central1 (Middle East Hub)',
        masterHost: 'pg-master-me-3.gcp.internal',
        replicaHost: 'pg-replica-me-3.gcp.internal'
      }
    };

    return nodes[nodeIndex] || nodes[1];
  }

  /**
   * Get overall cluster metrics for system status UI
   */
  public getBrokerStats() {
    return {
      activeTopics: Array.from(this.queues.keys()),
      messagesProcessed: this.messageStore.filter(m => m.status === 'processed').length,
      deadLetterQueueCount: this.messageStore.filter(m => m.status === 'failed').length,
      shardedNodes: this.shardedNodesCount,
      brokerType: 'Apache Kafka / RabbitMQ Resilience Wrapper'
    };
  }
}

export const microservicesBroker = new MicroservicesBroker();
