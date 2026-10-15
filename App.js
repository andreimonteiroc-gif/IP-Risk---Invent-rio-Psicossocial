import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import { useState } from 'react';

export default function App() {
  const[iniciou, setIniciou] = useState(false);
  if (iniciou) {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>
        Bem-vindo à avaliação!
      </Text>
      <Button
  title="Voltar ao início"
  onPress={() => setIniciou(false)}
/>

      <Text style={styles.descricao}>
        Em breve, você poderá responder ao questionário.
      </Text>
    </View>
  );
}
  return (
   <View style={styles.container}>
  <Text style={styles.titulo}>
    Inventário Psicossocial
  </Text>

  <Text style={styles.descricao}>
    Avaliação de riscos psicossociais no ambiente de trabalho
</Text>
    <Button
  title="Iniciar avaliação"
  onPress={() => setIniciou(true)}
/>

  <StatusBar style="auto" />
</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#183153',
    textAlign: 'center',
  },

  descricao: {
    fontSize: 16,
    color: '#526071',
    textAlign: 'center',
    marginTop: 15,
  },
});
