import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    try {
      Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    } catch {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <LinearGradient
          colors={['#0a0a14', '#12121f', '#1a1a2e']}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          <Text style={{ fontSize: 48, marginBottom: 16 }}>😵</Text>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 24 }}>
            Don't worry, your data is safe. Try again.
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            style={{ backgroundColor: '#ec4899', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        </LinearGradient>
      );
    }
    return this.props.children;
  }
}
