import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  type PressableProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/cn';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'gradient' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variantStyles = {
  primary: 'bg-primary-600 active:bg-primary-700',
  secondary: 'bg-white/10 active:bg-white/15',
  outline: 'border-2 border-primary-500 bg-transparent active:bg-primary-500/10',
  destructive: 'bg-red-600 active:bg-red-700',
  gradient: '',
  ghost: 'bg-transparent active:bg-white/5',
};

const variantTextStyles = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-primary-400',
  destructive: 'text-white',
  gradient: 'text-white',
  ghost: 'text-gray-400',
};

const sizeStyles = {
  sm: 'px-4 py-2.5',
  md: 'px-5 py-3.5',
  lg: 'px-7 py-4',
};

const sizeTextStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export default function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  if (variant === 'gradient') {
    return (
      <Pressable
        disabled={isDisabled}
        style={isDisabled ? { opacity: 0.5 } : undefined}
        {...props}
      >
        <LinearGradient
          colors={['#ec4899', '#a855f7', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 16 }}
        >
          <View className={cn('items-center justify-center', sizeStyles[size])}>
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className={cn('font-bold text-white', sizeTextStyles[size])}>
                {title}
              </Text>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      className={cn(
        'items-center justify-center rounded-2xl',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50'
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'outline' ? '#ec4899' : '#ffffff'}
        />
      ) : (
        <Text
          className={cn(
            'font-bold',
            variantTextStyles[variant],
            sizeTextStyles[size]
          )}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
